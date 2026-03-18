import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import '../game/constants.dart';
import '../game/game_state.dart';
import '../game/game_painter.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});
  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with SingleTickerProviderStateMixin {
  final GameState _gs = GameState();
  late Ticker _ticker;
  Duration _lastTime = Duration.zero;
  int? _hoverCol, _hoverRow;

  @override
  void initState() {
    super.initState();
    _gs.onHudUpdate = () { if (mounted) setState(() {}); };
    _ticker = createTicker((elapsed) {
      final dt = ((elapsed - _lastTime).inMicroseconds / 1000000.0).clamp(0.0, 0.05);
      _lastTime = elapsed;
      _gs.update(dt);
      if (mounted) setState(() {});
    });
    _ticker.start();
  }

  @override
  void dispose() { _ticker.dispose(); super.dispose(); }

  void _onTap(Offset local, double cell) {
    final col = (local.dx / cell).floor();
    final row = (local.dy / cell).floor();
    if (_gs.selectedType != null) {
      _gs.placeTower(col, row);
    } else {
      if (!_gs.selectPlacedTower(col, row)) {
        _gs.selectedTower = null;
      }
    }
    setState(() {});
  }

  void _onHover(Offset local, double cell) {
    setState(() {
      _hoverCol = (local.dx / cell).floor();
      _hoverRow = (local.dy / cell).floor();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Show win/lose overlay after frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_gs.status == GameStatus.win) _showEndDialog(true);
      if (_gs.status == GameStatus.lose) _showEndDialog(false);
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0C29), Color(0xFF302B63), Color(0xFF24243E)],
          ),
        ),
        child: SafeArea(
        child: LayoutBuilder(builder: (ctx, constraints) {
          // Calculate cell size to fit canvas inside available space
          final availH = constraints.maxHeight - 56 - 90 - 36 - 32; // hud + shop + controls + title
          final availW = constraints.maxWidth;
          final cell = ((availW / kCols).clamp(0.0, availH / kRows.toDouble())).floorToDouble();
          final canvasW = cell * kCols;
          final canvasH = cell * kRows;

          return Column(
            children: [
              _buildTitle(),
              _buildHud(),
              _buildControls(),
              // Game canvas
              Expanded(
                child: Center(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: canvasW, height: canvasH,
                      child: MouseRegion(
                        onHover: (e) => _onHover(e.localPosition, cell),
                        onExit: (_) => setState(() { _hoverCol = null; _hoverRow = null; }),
                        child: GestureDetector(
                          onTapUp: (e) => _onTap(e.localPosition, cell),
                          onSecondaryTap: _cancelSelection,
                          onLongPress: _cancelSelection,
                          child: CustomPaint(
                            size: Size(canvasW, canvasH),
                            painter: GamePainter(_gs, cell,
                                hoverCol: _hoverCol, hoverRow: _hoverRow),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              _buildShop(),
            ],
          );
        }),
      ),
      ),
    );
  }

  void _cancelSelection() {
    setState(() {
      _gs.selectedType = null;
      _gs.selectedTower = null;
    });
  }

  // ── Title ────────────────────────────────────────────────────────
  Widget _buildTitle() {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 2),
      child: ShaderMask(
        shaderCallback: (bounds) => const LinearGradient(
          colors: [Color(0xFFa18cd1), Color(0xFFfbc2eb), Color(0xFFa1c4fd)],
        ).createShader(bounds),
        child: const Text(
          '⚔️ 타워 디펜스',
          style: TextStyle(
            fontSize: 20, fontWeight: FontWeight.w800,
            color: Colors.white, letterSpacing: 2,
          ),
        ),
      ),
    );
  }

  // ── HUD ──────────────────────────────────────────────────────────
  Widget _buildHud() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _hudItem('💰 골드', '\$${_gs.money}', const Color(0xFFffd700)),
          _hudItem('❤️ 기지', '${_gs.lives}', const Color(0xFF69db7c)),
          _hudItem('🌊 웨이브', '${_gs.waveIdx} / ${kWaves.length}', const Color(0xFFfbc2eb)),
          _hudItem('👾 남은 적',
              _gs.isWave ? '${_gs.remainingEnemies}' : '-', const Color(0xFF74c0fc)),
        ],
      ),
    );
  }

  Widget _hudItem(String label, String value, Color color) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16)),
      Text(label, style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 10)),
    ],
  );

  // ── Controls ─────────────────────────────────────────────────────
  Widget _buildControls() {
    final canStart = _gs.status == GameStatus.idle || _gs.status == GameStatus.between;
    final waveLabel = canStart ? '▶ 웨이브 ${_gs.waveIdx + 1} 시작' : '진행 중...';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Row(
        children: [
          _ctrlBtn(waveLabel, onTap: canStart ? _gs.startWave : null,
              color: const Color(0xFF69db7c)),
          const SizedBox(width: 6),
          _ctrlBtn(_gs.paused ? '▶ 재개' : '⏸ 정지',
              onTap: () => setState(() => _gs.paused = !_gs.paused),
              active: _gs.paused),
          const SizedBox(width: 6),
          _ctrlBtn('⚡ ${_gs.speedMult == 1 ? "1×" : "2×"}',
              onTap: () => setState(() => _gs.speedMult = _gs.speedMult == 1 ? 2 : 1),
              active: _gs.speedMult == 2),
          const SizedBox(width: 6),
          _ctrlBtn('🔄 새로시작', onTap: _confirmRestart,
              color: const Color(0xFFff8787)),
          const SizedBox(width: 6),
          if (_gs.selectedTower != null) ...[
            _ctrlBtn(
              '💰 팔기 \$${(_gs.kTowerDef(_gs.selectedTower!.type).cost * 0.7).round()}',
              onTap: () { _gs.sellTower(); setState(() {}); },
              color: const Color(0xFFffd700),
            ),
            const SizedBox(width: 6),
            _ctrlBtn('✕ 취소', onTap: _cancelSelection),
          ],
          if (_gs.selectedType != null) ...[
            _ctrlBtn('✕ 취소', onTap: _cancelSelection),
          ],
          const Spacer(),
          _affinityButton(),
        ],
      ),
    );
  }

  Widget _ctrlBtn(String label, {VoidCallback? onTap, Color? color, bool active = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? (color ?? const Color(0xFFfbc2eb)).withOpacity(0.2)
              : Colors.white.withOpacity(onTap == null ? 0.02 : 0.06),
          border: Border.all(color: active
              ? (color ?? const Color(0xFFfbc2eb))
              : (color ?? Colors.white).withOpacity(onTap == null ? 0.1 : 0.2)),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(label, style: TextStyle(
          color: onTap == null
              ? Colors.white.withOpacity(0.3)
              : (active ? (color ?? const Color(0xFFfbc2eb)) : color ?? Colors.white),
          fontWeight: FontWeight.w700, fontSize: 12,
        )),
      ),
    );
  }

  Widget _affinityButton() => GestureDetector(
    onTap: _showAffinityTable,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.06),
        border: Border.all(color: Colors.white.withOpacity(0.15)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Text('⚔️ 상성', style: TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w700)),
    ),
  );

  // ── Shop ─────────────────────────────────────────────────────────
  Widget _buildShop() {
    return Container(
      height: 90,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: kTowerDefs.entries.map((e) => _shopBtn(e.key, e.value)).toList(),
      ),
    );
  }

  Widget _shopBtn(String type, TowerDef def) {
    final active = _gs.selectedType == type;
    final canAfford = _gs.money >= def.cost;
    return GestureDetector(
      onTap: canAfford ? () => setState(() {
        _gs.selectedTower = null;
        _gs.selectedType = _gs.selectedType == type ? null : type;
      }) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? Color(def.color).withOpacity(0.18) : Colors.white.withOpacity(0.05),
          border: Border.all(
            color: active ? Color(def.color) : Colors.white.withOpacity(canAfford ? 0.15 : 0.06),
            width: active ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Opacity(
          opacity: canAfford ? 1.0 : 0.35,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(def.icon, style: const TextStyle(fontSize: 20)),
              Text(def.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
              Text('\$${def.cost}', style: const TextStyle(fontSize: 11, color: Color(0xFFffd700), fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }

  // ── Dialogs ───────────────────────────────────────────────────────
  bool _dialogShown = false;
  void _showEndDialog(bool win) {
    if (_dialogShown) return;
    _dialogShown = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          backgroundColor: const Color(0xFF1a1a3e),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: Colors.purple.withOpacity(0.5), width: 2),
          ),
          title: Text(win ? '🏆 승리!' : '💀 게임 오버',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white)),
          content: Text(
            win ? '웨이브 ${kWaves.length} 모두 격퇴!\n남은 골드: \$${_gs.money}'
                : '기지가 함락되었습니다',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFFfbc2eb), fontSize: 15),
          ),
          actions: [
            Center(child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFa18cd1),
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              ),
              onPressed: () {
                Navigator.pop(context);
                _dialogShown = false;
                setState(() => _gs.reset());
              },
              child: const Text('다시 하기', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            )),
          ],
        ),
      );
    });
  }

  void _confirmRestart() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a3e),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.red.withOpacity(0.4), width: 2),
        ),
        title: const Text('새로 시작', textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        content: const Text('정말 처음부터 다시 시작할까요?',
            textAlign: TextAlign.center, style: TextStyle(color: Colors.white70)),
        actions: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            TextButton(onPressed: () => Navigator.pop(context),
                child: const Text('취소', style: TextStyle(color: Colors.white54))),
            const SizedBox(width: 12),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFff6b6b), foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              onPressed: () {
                Navigator.pop(context);
                _dialogShown = false;
                setState(() => _gs.reset());
              },
              child: const Text('다시 시작', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ]),
        ],
      ),
    );
  }

  void _showAffinityTable() {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF1a1a3e),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.white.withOpacity(0.15))),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('⚔️ 상성표', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 12),
              _affinityTable(),
              const SizedBox(height: 8),
              TextButton(onPressed: () => Navigator.pop(context),
                  child: const Text('닫기', style: TextStyle(color: Colors.white54))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _affinityTable() {
    const headers = ['', '🔴일반', '🛡기갑', '⚡고속', '👻유령', '💀보스'];
    const rows = [
      ['🗼기본',   '보통', '약함', '보통', '무효', '보통'],
      ['🎯저격',   '보통', '강함', '약함', '약함', '보통'],
      ['❄️빙결',  '보통', '보통', '보통', '강함', '슬로우\n무효'],
      ['🔥화염',   '보통', '약함', '강함', '강함', '보통'],
      ['💣폭탄',   '보통', '특효', '약함', '무효', '보통'],
    ];
    Color cellColor(String v) {
      if (v == '특효') return const Color(0xFFff6b6b);
      if (v == '강함') return const Color(0xFFffa94d);
      if (v == '약함') return const Color(0xFF868e96);
      if (v.contains('무효')) return const Color(0xFF495057);
      return Colors.white54;
    }
    TextStyle cellStyle(String v) => TextStyle(
      color: cellColor(v), fontSize: 11,
      fontWeight: v == '특효' || v == '강함' ? FontWeight.w800 : FontWeight.normal,
    );

    return Table(
      defaultColumnWidth: const IntrinsicColumnWidth(),
      border: TableBorder.all(color: Colors.white.withOpacity(0.08)),
      children: [
        TableRow(children: headers.map((h) => Padding(
          padding: const EdgeInsets.all(6),
          child: Text(h, style: const TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
        )).toList()),
        ...rows.map((row) => TableRow(children: row.asMap().entries.map((e) => Padding(
          padding: const EdgeInsets.all(6),
          child: Text(e.value, style: e.key == 0
              ? const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)
              : cellStyle(e.value),
            textAlign: TextAlign.center),
        )).toList())),
      ],
    );
  }
}

// Extension for convenience
extension GameStateExt on GameState {
  TowerDef kTowerDef(String type) => kTowerDefs[type]!;
}
