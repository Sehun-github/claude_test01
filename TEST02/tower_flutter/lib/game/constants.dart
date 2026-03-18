// ── Grid ────────────────────────────────────────────────────────────
const int kCols = 16;
const int kRows = 12;

// Waypoints in grid units (col.5 = cell center).
// pixel = gridUnit * cellSize
const List<List<double>> kWaypointGrid = [
  [8.5, -0.5],
  [8.5, 3.5],
  [2.5, 3.5],
  [2.5, 7.5],
  [13.5, 7.5],
  [13.5, 10.5],
  [7.5, 10.5],
  [7.5, 12.5],
];

// Path cells — no tower placement allowed
final Set<String> kPathCells = () {
  final s = <String>{};
  for (int r = 0; r <= 3; r++) s.add('8,$r');
  for (int c = 2; c <= 8; c++) s.add('$c,3');
  for (int r = 3; r <= 7; r++) s.add('2,$r');
  for (int c = 2; c <= 13; c++) s.add('$c,7');
  for (int r = 7; r <= 10; r++) s.add('13,$r');
  for (int c = 7; c <= 13; c++) s.add('$c,10');
  for (int r = 10; r <= 11; r++) s.add('7,$r');
  return s;
}();

// ── Tower definitions ────────────────────────────────────────────────
class TowerDef {
  final String name;
  final String icon;
  final int cost;
  final double dmg;
  final double range; // in grid units
  final double rate;  // attacks per second
  final int color;    // ARGB
  final double slow;  // slow factor (1 = no slow)
  final double splash;// splash radius in grid units (0 = no splash)
  const TowerDef({
    required this.name, required this.icon, required this.cost,
    required this.dmg, required this.range, required this.rate,
    required this.color, required this.slow, required this.splash,
  });
}

const Map<String, TowerDef> kTowerDefs = {
  'basic':  TowerDef(name:'기본', icon:'🗼', cost:50,  dmg:15, range:3.0, rate:1.0, color:0xFFa18cd1, slow:1,   splash:0),
  'sniper': TowerDef(name:'저격', icon:'🎯', cost:100, dmg:50, range:5.0, rate:0.5, color:0xFF74c0fc, slow:1,   splash:0),
  'slow':   TowerDef(name:'빙결', icon:'❄️', cost:75,  dmg:8,  range:2.5, rate:1.5, color:0xFF85d8e8, slow:0.4, splash:0),
  'flame':  TowerDef(name:'화염', icon:'🔥', cost:65,  dmg:12, range:2.1, rate:3.0, color:0xFFff922b, slow:1,   splash:0),
  'bomb':   TowerDef(name:'폭탄', icon:'💣', cost:130, dmg:55, range:3.6, rate:0.4, color:0xFFffd43b, slow:1,   splash:1.9),
};

// ── Enemy type definitions ───────────────────────────────────────────
class EnemyTypeDef {
  final String label;
  final String? icon;
  final int color;
  final int? borderColor;
  final double alpha;
  const EnemyTypeDef({required this.label, this.icon, required this.color, this.borderColor, required this.alpha});
}

const Map<String, EnemyTypeDef> kEtypes = {
  'normal':  EnemyTypeDef(label:'일반', icon:null,  color:0xFFff8787, alpha:1.0),
  'armored': EnemyTypeDef(label:'기갑', icon:'🛡',  color:0xFF868e96, borderColor:0xFFced4da, alpha:1.0),
  'swift':   EnemyTypeDef(label:'고속', icon:'⚡',  color:0xFF40c057, alpha:1.0),
  'ghost':   EnemyTypeDef(label:'유령', icon:'👻',  color:0xFFb197fc, borderColor:0x88b197fc, alpha:0.55),
  'boss':    EnemyTypeDef(label:'보스', icon:null,  color:0xFFf03e3e, borderColor:0xFFffd700, alpha:1.0),
};

// ── Affinity table ───────────────────────────────────────────────────
// RESISTS[enemyType][towerType] = damage multiplier
const Map<String, Map<String, double>> kResists = {
  'normal':  {'basic':1.0, 'sniper':1.0, 'slow':1.0, 'flame':1.0, 'bomb':1.0},
  'armored': {'basic':0.4, 'sniper':1.8, 'slow':1.0, 'flame':0.4, 'bomb':2.5},
  'swift':   {'basic':1.0, 'sniper':0.5, 'slow':1.0, 'flame':2.0, 'bomb':0.6},
  'ghost':   {'basic':0.1, 'sniper':0.5, 'slow':2.0, 'flame':1.8, 'bomb':0.1},
  'boss':    {'basic':1.0, 'sniper':1.0, 'slow':0.0, 'flame':1.0, 'bomb':1.0},
};

// ── Wave definitions ─────────────────────────────────────────────────
class EnemyGroup {
  final int count;
  final double hp;
  final double spd; // pixels per second in grid units
  final int reward;
  final double sz;  // radius in grid units
  final String etype;
  const EnemyGroup({required this.count, required this.hp, required this.spd,
    required this.reward, required this.sz, required this.etype});
}

const List<List<EnemyGroup>> kWaves = [
  [EnemyGroup(count:12, hp:90,   spd:1.38, reward:15,  sz:0.27, etype:'normal')],
  [EnemyGroup(count:14, hp:140,  spd:1.55, reward:22,  sz:0.32, etype:'normal'),
   EnemyGroup(count:7,  hp:65,   spd:3.62, reward:12,  sz:0.22, etype:'swift')],
  [EnemyGroup(count:16, hp:220,  spd:1.5,  reward:28,  sz:0.32, etype:'armored'),
   EnemyGroup(count:8,  hp:90,   spd:3.45, reward:14,  sz:0.22, etype:'swift'),
   EnemyGroup(count:3,  hp:520,  spd:0.95, reward:90,  sz:0.50, etype:'boss')],
  [EnemyGroup(count:14, hp:280,  spd:1.45, reward:32,  sz:0.35, etype:'armored'),
   EnemyGroup(count:10, hp:160,  spd:1.3,  reward:28,  sz:0.30, etype:'ghost'),
   EnemyGroup(count:8,  hp:100,  spd:3.3,  reward:15,  sz:0.25, etype:'swift'),
   EnemyGroup(count:4,  hp:850,  spd:1.0,  reward:140, sz:0.52, etype:'boss')],
  [EnemyGroup(count:18, hp:380,  spd:1.55, reward:38,  sz:0.35, etype:'armored'),
   EnemyGroup(count:14, hp:300,  spd:1.38, reward:35,  sz:0.32, etype:'ghost'),
   EnemyGroup(count:12, hp:130,  spd:3.7,  reward:18,  sz:0.25, etype:'swift'),
   EnemyGroup(count:5,  hp:1300, spd:1.05, reward:220, sz:0.60, etype:'boss')],
];
