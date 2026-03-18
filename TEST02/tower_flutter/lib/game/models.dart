import 'dart:math';
import 'dart:ui';
import 'constants.dart';

// ── Enemy ────────────────────────────────────────────────────────────
class Enemy {
  double hp;
  final double maxHp;
  final double baseSpd;
  double spd;
  final int reward;
  final String etype;
  final bool isBoss;
  final double sz; // radius in grid units
  int waypointIdx = 0;
  double x, y;     // position in grid units
  double dist = 0; // total distance traveled
  bool dead = false;
  double slowTimer = 0;

  double get alpha => etype == 'ghost' ? 0.55 : 1.0;

  Enemy({
    required double hp,
    required this.baseSpd,
    required this.reward,
    required this.etype,
    required this.sz,
  })  : hp = hp,
        maxHp = hp,
        spd = baseSpd,
        isBoss = etype == 'boss',
        x = kWaypointGrid[0][0],
        y = kWaypointGrid[0][1];

  void update(double dt, Function(int) onReachBase, Function() onUpdate) {
    if (dead) return;
    if (slowTimer > 0) {
      slowTimer -= dt;
      if (slowTimer <= 0) spd = baseSpd;
    }
    double move = spd * dt;
    while (move > 0 && waypointIdx < kWaypointGrid.length - 1) {
      final tx = kWaypointGrid[waypointIdx + 1][0];
      final ty = kWaypointGrid[waypointIdx + 1][1];
      final dx = tx - x, dy = ty - y;
      final d = sqrt(dx * dx + dy * dy);
      if (d <= move) {
        x = tx; y = ty; dist += d; move -= d; waypointIdx++;
      } else {
        x += dx / d * move; y += dy / d * move; dist += move; move = 0;
      }
    }
    if (waypointIdx >= kWaypointGrid.length - 1) {
      dead = true;
      onReachBase(isBoss ? 3 : 1);
    }
  }

  // Returns actual damage dealt; ttype = tower type string
  double hit(double dmg, double slow, String ttype, List<FloatText> floats) {
    if (dead) return 0;
    final resist = kResists[etype] ?? kResists['normal']!;
    final mult = resist[ttype] ?? 1.0;
    // Slow: boss immune, ghost amplified
    if (slow < 1 && mult > 0) {
      final slowFactor = (etype == 'boss') ? 1.0 : (etype == 'ghost' && ttype == 'slow') ? 0.2 : slow;
      spd = baseSpd * slowFactor;
      slowTimer = 1.5;
    }
    final actual = dmg * mult;
    hp -= actual;

    final dmgColor = mult >= 1.8
        ? const Color(0xFFff6b6b)
        : mult >= 1.2
            ? const Color(0xFFffa94d)
            : mult <= 0.2
                ? const Color(0xFF868e96)
                : mult <= 0.6
                    ? const Color(0xFFadb5bd)
                    : const Color(0xFFFFFFFF);
    final dmgTxt = mult >= 1.5
        ? '${actual.round()}!!'
        : mult <= 0.3
            ? '${actual.round()}...'
            : '${actual.round()}';
    floats.add(FloatText(
      x: x + (Random().nextDouble() - 0.5) * 0.4,
      y: y - sz - 0.15,
      text: dmgTxt,
      color: dmgColor,
      fontSize: mult >= 1.5 ? 14 : 11,
    ));

    if (hp <= 0) {
      dead = true;
      return actual;
    }
    return actual;
  }
}

// ── Tower ────────────────────────────────────────────────────────────
class Tower {
  final int col, row;
  final double cx, cy; // center in grid units
  final String type;
  double cooldown = 0;
  double angle = -pi / 2;
  int kills = 0;

  Tower({required this.col, required this.row, required this.type})
      : cx = col + 0.5,
        cy = row + 0.5;

  void update(double dt, List<Enemy> enemies, List<Projectile> projs) {
    final def = kTowerDefs[type]!;
    if (cooldown > 0) { cooldown -= dt; return; }
    final inRange = enemies
        .where((e) => !e.dead && _dist(cx, cy, e.x, e.y) <= def.range)
        .toList()
      ..sort((a, b) => b.dist.compareTo(a.dist));
    if (inRange.isEmpty) return;
    final tgt = inRange.first;
    angle = atan2(tgt.y - cy, tgt.x - cx);
    projs.add(Projectile(
      x: cx, y: cy, target: tgt,
      dmg: def.dmg, color: Color(def.color), slow: def.slow,
      ttype: type, splash: def.splash, src: this,
    ));
    cooldown = 1.0 / def.rate;
  }

  double _dist(double ax, double ay, double bx, double by) =>
      sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
}

// ── Projectile ───────────────────────────────────────────────────────
class Projectile {
  double x, y;
  Enemy target;
  final double dmg;
  final Color color;
  final double slow;
  final String ttype;
  final double splash;
  final Tower src;
  bool dead = false;
  final double spd;

  Projectile({
    required this.x, required this.y, required this.target,
    required this.dmg, required this.color, required this.slow,
    required this.ttype, required this.splash, required this.src,
  }) : spd = splash > 0 ? 5.5 : 8.0;

  void update(double dt, List<Enemy> enemies, List<FloatText> floats,
      Function(int) addKill) {
    if (target.dead && splash == 0) { dead = true; return; }
    final dx = target.x - x, dy = target.y - y;
    final d = sqrt(dx * dx + dy * dy);
    if (d < 0.25) {
      if (splash > 0) {
        for (final e in enemies) {
          if (!e.dead && sqrt(pow(e.x - x, 2) + pow(e.y - y, 2)) <= splash) {
            final resist = kResists[e.etype]?[ttype] ?? 1.0;
            final wasDead = e.hp <= dmg * resist;
            e.hit(dmg, slow, ttype, floats);
            if (wasDead) addKill(1);
          }
        }
        floats.add(SplashFx(x: x, y: y, radius: splash, color: color));
      } else {
        final resist = kResists[target.etype]?[ttype] ?? 1.0;
        final wasDead = target.hp <= dmg * resist;
        target.hit(dmg, slow, ttype, floats);
        if (wasDead) addKill(1);
      }
      dead = true;
    } else {
      x += dx / d * spd * dt;
      y += dy / d * spd * dt;
    }
  }
}

// ── FloatText ────────────────────────────────────────────────────────
class FloatText {
  double x, y;
  final String text;
  final Color color;
  final double fontSize;
  double life;
  final double maxLife = 1.1;

  FloatText({required this.x, required this.y, required this.text,
    required this.color, this.fontSize = 13}) : life = 1.1;

  void update(double dt) { life -= dt; y -= 0.95 * dt; }
  bool get dead => life <= 0;

  FloatText._({required this.x, required this.y, required this.text,
    required this.color, required this.fontSize, required this.life});
}

// ── SplashFx ─────────────────────────────────────────────────────────
class SplashFx extends FloatText {
  final double radius;

  SplashFx({required double x, required double y, required this.radius,
    required Color color})
      : super._(x: x, y: y, text: '', color: color, fontSize: 0, life: 0.35);

  @override
  void update(double dt) { life -= dt; }
}
