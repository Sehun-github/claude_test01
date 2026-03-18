import 'dart:math';
import 'dart:ui' show Color;
import 'constants.dart';
import 'models.dart';

enum GameStatus { idle, spawning, active, between, win, lose }

class SpawnEntry {
  final EnemyGroup group;
  final double time;
  SpawnEntry(this.group, this.time);
}

class GameState {
  int money = 200;
  int lives = 20;
  int waveIdx = 0;
  GameStatus status = GameStatus.idle;

  List<Tower> towers = [];
  List<Enemy> enemies = [];
  List<Projectile> projectiles = [];
  List<FloatText> floats = [];
  List<SpawnEntry> spawnQueue = [];
  Map<String, Tower> towerMap = {};

  double waveTimer = 0;
  bool paused = false;
  double speedMult = 1.0;

  String? selectedType; // tower type being placed
  Tower? selectedTower; // placed tower being inspected

  // Callback to notify UI
  Function()? onHudUpdate;

  void reset() {
    money = 200; lives = 20; waveIdx = 0;
    status = GameStatus.idle;
    towers = []; enemies = []; projectiles = []; floats = [];
    spawnQueue = []; towerMap = {};
    waveTimer = 0; paused = false; speedMult = 1.0;
    selectedType = null; selectedTower = null;
  }

  void update(double dt) {
    if (paused) {
      floats.removeWhere((f) => f.dead);
      return;
    }
    if (status == GameStatus.idle || status == GameStatus.between ||
        status == GameStatus.win   || status == GameStatus.lose) return;

    final scaledDt = dt * speedMult;
    waveTimer += scaledDt;

    // Spawn enemies
    final toSpawn = spawnQueue.where((s) => s.time <= waveTimer).toList();
    for (final s in toSpawn) {
      enemies.add(Enemy(
        hp: s.group.hp, baseSpd: s.group.spd,
        reward: s.group.reward, etype: s.group.etype, sz: s.group.sz,
      ));
    }
    spawnQueue.removeWhere((s) => s.time <= waveTimer);
    if (spawnQueue.isEmpty && status == GameStatus.spawning) {
      status = GameStatus.active;
    }

    // Update game objects
    for (final t in towers) t.update(scaledDt, enemies, projectiles);
    for (final e in enemies) {
      e.update(scaledDt, (dmg) {
        lives = max(0, lives - dmg);
        onHudUpdate?.call();
        if (lives <= 0 && status != GameStatus.lose) status = GameStatus.lose;
      }, () => onHudUpdate?.call());
    }
    for (final p in projectiles) {
      p.update(scaledDt, enemies, floats, (n) {
        p.src.kills += n;
      });
    }
    for (final f in floats) f.update(scaledDt);

    enemies.removeWhere((e) => e.dead);
    projectiles.removeWhere((p) => p.dead);
    floats.removeWhere((f) => f.dead);

    _checkWaveEnd();
    onHudUpdate?.call();
  }

  void _checkWaveEnd() {
    if (status != GameStatus.active) return;
    if (enemies.any((e) => !e.dead)) return;
    if (waveIdx >= kWaves.length) {
      status = GameStatus.win;
    } else {
      status = GameStatus.between;
      money += 75;
      floats.add(FloatText(
        x: kCols / 2.0, y: kRows / 2.0 - 0.8,
        text: '웨이브 $waveIdx 클리어!  +\$75',
        color: const Color(0xFF69db7c), fontSize: 15,
      ));
      onHudUpdate?.call();
    }
  }

  void startWave() {
    if (status != GameStatus.idle && status != GameStatus.between) return;
    if (waveIdx >= kWaves.length) return;
    if (paused) paused = false;
    status = GameStatus.spawning;
    waveTimer = 0;
    spawnQueue.clear();
    double t = 0;
    for (final group in kWaves[waveIdx]) {
      for (int i = 0; i < group.count; i++) {
        spawnQueue.add(SpawnEntry(group, t));
        t += 1.0;
      }
    }
    waveIdx++;
    onHudUpdate?.call();
  }

  bool placeTower(int col, int row) {
    if (selectedType == null) return false;
    final key = '$col,$row';
    if (kPathCells.contains(key) || towerMap.containsKey(key)) return false;
    if (col < 0 || col >= kCols || row < 0 || row >= kRows) return false;
    final def = kTowerDefs[selectedType!]!;
    if (money < def.cost) {
      floats.add(FloatText(
        x: col + 0.5, y: row + 0.2, text: '골드 부족!',
        color: const Color(0xFFff6b6b), fontSize: 12,
      ));
      return false;
    }
    money -= def.cost;
    final t = Tower(col: col, row: row, type: selectedType!);
    towers.add(t);
    towerMap[key] = t;
    onHudUpdate?.call();
    return true;
  }

  bool selectPlacedTower(int col, int row) {
    final key = '$col,$row';
    if (towerMap.containsKey(key)) {
      selectedType = null;
      selectedTower = towerMap[key];
      return true;
    }
    return false;
  }

  void sellTower() {
    if (selectedTower == null) return;
    final key = '${selectedTower!.col},${selectedTower!.row}';
    final sellVal = (kTowerDefs[selectedTower!.type]!.cost * 0.7).round();
    money += sellVal;
    floats.add(FloatText(
      x: selectedTower!.cx, y: selectedTower!.cy - 0.3,
      text: '+\$$sellVal', color: const Color(0xFFffd700), fontSize: 13,
    ));
    towers.remove(selectedTower);
    towerMap.remove(key);
    selectedTower = null;
    onHudUpdate?.call();
  }

  int get remainingEnemies =>
      enemies.where((e) => !e.dead).length + spawnQueue.length;

  bool get isWave => status == GameStatus.spawning || status == GameStatus.active;
}
