import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'constants.dart';
import 'models.dart';
import 'game_state.dart';

class GamePainter extends CustomPainter {
  final GameState gs;
  final double cell;
  final int? hoverCol;
  final int? hoverRow;

  GamePainter(this.gs, this.cell, {this.hoverCol, this.hoverRow});

  // Convert grid units to pixels
  double px(double g) => g * cell;

  @override
  void paint(Canvas canvas, Size size) {
    _drawGrid(canvas);
    if (gs.selectedType != null && hoverCol != null && hoverRow != null) {
      _drawPlacePreview(canvas, hoverCol!, hoverRow!);
    }
    if (gs.selectedTower != null) _drawTowerRange(canvas, gs.selectedTower!);
    for (final t in gs.towers) _drawTower(canvas, t);
    for (final e in gs.enemies) _drawEnemy(canvas, e);
    for (final p in gs.projectiles) _drawProj(canvas, p);
    for (final f in gs.floats) _drawFloat(canvas, f);
    _drawMarkers(canvas, size);
    if (gs.paused) _drawPauseOverlay(canvas, size);
  }

  void _drawGrid(Canvas canvas) {
    for (int r = 0; r < kRows; r++) {
      for (int c = 0; c < kCols; c++) {
        final isPath = kPathCells.contains('$c,$r');
        final color = isPath
            ? const Color(0xFF211d3c)
            : ((r + c) % 2 == 0 ? const Color(0xFF16133a) : const Color(0xFF1a1740));
        canvas.drawRect(
          Rect.fromLTWH(px(c.toDouble()), px(r.toDouble()), cell, cell),
          Paint()..color = color,
        );
        if (!isPath) {
          canvas.drawRect(
            Rect.fromLTWH(px(c.toDouble()) + 0.5, px(r.toDouble()) + 0.5, cell - 1, cell - 1),
            Paint()..color = const Color(0x08FFFFFF)..style = PaintingStyle.stroke..strokeWidth = 0.5,
          );
        }
      }
    }
    // Path border glow
    final borderPaint = Paint()
      ..color = const Color(0x22ffb450)..style = PaintingStyle.stroke..strokeWidth = 1.2;
    for (final key in kPathCells) {
      final parts = key.split(',');
      final pc = int.parse(parts[0]), pr = int.parse(parts[1]);
      void tryEdge(int dc, int dr, Offset a, Offset b) {
        if (!kPathCells.contains('${pc + dc},${pr + dr}')) {
          canvas.drawLine(a, b, borderPaint);
        }
      }
      tryEdge(0, -1, Offset(px(pc.toDouble()), px(pr.toDouble())), Offset(px(pc + 1.0), px(pr.toDouble())));
      tryEdge(0, 1,  Offset(px(pc.toDouble()), px(pr + 1.0)), Offset(px(pc + 1.0), px(pr + 1.0)));
      tryEdge(-1, 0, Offset(px(pc.toDouble()), px(pr.toDouble())), Offset(px(pc.toDouble()), px(pr + 1.0)));
      tryEdge(1, 0,  Offset(px(pc + 1.0), px(pr.toDouble())), Offset(px(pc + 1.0), px(pr + 1.0)));
    }
    // Dashed path center line
    final dashPaint = Paint()
      ..color = const Color(0x18ffb450)..style = PaintingStyle.stroke..strokeWidth = 1.2;
    for (int i = 0; i < kWaypointGrid.length - 1; i++) {
      final a = Offset(px(kWaypointGrid[i][0]), px(kWaypointGrid[i][1]));
      final b = Offset(px(kWaypointGrid[i + 1][0]), px(kWaypointGrid[i + 1][1]));
      _drawDashedLine(canvas, a, b, dashPaint, px(0.15), px(0.2));
    }
  }

  void _drawDashedLine(Canvas canvas, Offset a, Offset b, Paint paint, double dash, double gap) {
    final dx = b.dx - a.dx, dy = b.dy - a.dy;
    final len = sqrt(dx * dx + dy * dy);
    double pos = 0;
    final nx = dx / len, ny = dy / len;
    while (pos < len) {
      final end = min(pos + dash, len);
      canvas.drawLine(
        Offset(a.dx + nx * pos, a.dy + ny * pos),
        Offset(a.dx + nx * end, a.dy + ny * end),
        paint,
      );
      pos += dash + gap;
    }
  }

  void _drawPlacePreview(Canvas canvas, int hc, int hr) {
    final key = '$hc,$hr';
    final canPlace = !kPathCells.contains(key) && !gs.towerMap.containsKey(key);
    final def = kTowerDefs[gs.selectedType!]!;
    canvas.drawRect(
      Rect.fromLTWH(px(hc.toDouble()), px(hr.toDouble()), cell, cell),
      Paint()..color = canPlace ? const Color(0x2969db7c) : const Color(0x29ff6b6b),
    );
    canvas.drawRect(
      Rect.fromLTWH(px(hc.toDouble()) + 1, px(hr.toDouble()) + 1, cell - 2, cell - 2),
      Paint()..color = canPlace ? const Color(0x7769db7c) : const Color(0x77ff6b6b)
        ..style = PaintingStyle.stroke..strokeWidth = 2,
    );
    if (canPlace) {
      canvas.drawCircle(
        Offset(px(hc + 0.5), px(hr + 0.5)), px(def.range),
        Paint()..color = Color(def.color).withOpacity(0.12),
      );
      canvas.drawCircle(
        Offset(px(hc + 0.5), px(hr + 0.5)), px(def.range),
        Paint()..color = Color(def.color).withOpacity(0.35)
          ..style = PaintingStyle.stroke..strokeWidth = 1,
      );
    }
  }

  void _drawTowerRange(Canvas canvas, Tower t) {
    final def = kTowerDefs[t.type]!;
    canvas.drawCircle(
      Offset(px(t.cx), px(t.cy)), px(def.range),
      Paint()..color = Color(def.color).withOpacity(0.12),
    );
    canvas.drawCircle(
      Offset(px(t.cx), px(t.cy)), px(def.range),
      Paint()..color = Color(def.color).withOpacity(0.4)
        ..style = PaintingStyle.stroke..strokeWidth = 1.5,
    );
    canvas.drawRect(
      Rect.fromLTWH(px(t.col.toDouble()) + 1, px(t.row.toDouble()) + 1, cell - 2, cell - 2),
      Paint()..color = Colors.white.withOpacity(0.45)
        ..style = PaintingStyle.stroke..strokeWidth = 2,
    );
  }

  void _drawTower(Canvas canvas, Tower t) {
    final cx = px(t.cx), cy = px(t.cy);
    final def = kTowerDefs[t.type]!;
    // Shadow
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy + cell * 0.4), width: cell * 0.6, height: cell * 0.25),
      Paint()..color = const Color(0x66000000),
    );
    // Base
    canvas.drawCircle(Offset(cx, cy), cell * 0.42,
        Paint()..color = const Color(0x99000000));
    // Body
    canvas.drawCircle(Offset(cx, cy), cell * 0.33,
        Paint()..color = Color(def.color).withOpacity(0.9));
    // Barrel
    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(t.angle);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cell * 0.05, -cell * 0.075,
            t.type == 'sniper' ? cell * 0.45 : cell * 0.3, cell * 0.15),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xBB000000),
    );
    canvas.restore();
    // Icon
    _drawText(canvas, kTowerDefs[t.type]!.icon, Offset(cx, cy),
        fontSize: cell * 0.35, center: true);
  }

  void _drawEnemy(Canvas canvas, Enemy e) {
    if (e.dead) return;
    final et = kEtypes[e.etype]!;
    final cx = px(e.x), cy = px(e.y);
    final r = px(e.sz);
    final alpha = e.alpha;

    // Shadow
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy + r), width: r * 1.4, height: r * 0.5),
      Paint()..color = Color.fromRGBO(0, 0, 0, alpha * 0.4),
    );
    // Slow aura
    if (e.slowTimer > 0) {
      canvas.drawCircle(Offset(cx, cy), r + px(0.1),
          Paint()..color = const Color(0x6685d8e8));
    }
    // Ghost pulse ring
    if (e.etype == 'ghost') {
      canvas.drawCircle(Offset(cx, cy), r + px(0.17),
          Paint()..color = Color(et.color).withOpacity(0.15)
            ..style = PaintingStyle.stroke..strokeWidth = 1.5);
    }
    // Body
    canvas.drawCircle(Offset(cx, cy), r,
        Paint()..color = Color(et.color).withOpacity(alpha));
    // Border
    if (et.borderColor != null) {
      canvas.drawCircle(Offset(cx, cy), r,
          Paint()..color = Color(et.borderColor!).withOpacity(alpha)
            ..style = PaintingStyle.stroke..strokeWidth = e.isBoss ? 2.5 : 1.8);
    }
    // Type icon or boss label
    if (et.icon != null) {
      _drawText(canvas, et.icon!, Offset(cx, cy),
          fontSize: r * 0.95, center: true, opacity: alpha);
    } else if (e.isBoss) {
      _drawText(canvas, 'BOSS', Offset(cx, cy),
          fontSize: r * 0.55, center: true, color: const Color(0xFFffd700),
          bold: true, opacity: alpha);
    }
    // HP bar
    final bw = r * 2.8, bh = px(0.1);
    final bx = cx - bw / 2, by = cy - r - px(0.22);
    canvas.drawRect(Rect.fromLTWH(bx, by, bw, bh),
        Paint()..color = const Color(0xAA000000));
    final hpFrac = (e.hp / e.maxHp).clamp(0.0, 1.0);
    final hpColor = hpFrac > 0.5
        ? const Color(0xFF69db7c)
        : hpFrac > 0.25 ? const Color(0xFFffd43b) : const Color(0xFFff6b6b);
    canvas.drawRect(Rect.fromLTWH(bx, by, bw * hpFrac, bh),
        Paint()..color = hpColor);
  }

  void _drawProj(Canvas canvas, Projectile p) {
    canvas.drawCircle(Offset(px(p.x), px(p.y)), cell * 0.17,
        Paint()..color = p.color.withOpacity(0.4));
    canvas.drawCircle(Offset(px(p.x), px(p.y)), cell * 0.09,
        Paint()..color = p.color);
  }

  void _drawFloat(Canvas canvas, FloatText f) {
    if (f is SplashFx) {
      final t = f.life / 0.35;
      final r = px(f.radius) * (1 - t) * 1.1 + px(0.15);
      canvas.drawCircle(
        Offset(px(f.x), px(f.y)), r,
        Paint()..color = f.color.withOpacity(t * 0.55)
          ..style = PaintingStyle.stroke..strokeWidth = 3,
      );
      canvas.drawCircle(
        Offset(px(f.x), px(f.y)), r,
        Paint()..color = f.color.withOpacity(t * 0.15),
      );
      return;
    }
    final alpha = (f.life / f.maxLife * 2.0).clamp(0.0, 1.0);
    _drawText(canvas, f.text, Offset(px(f.x), px(f.y)),
        fontSize: f.fontSize * (cell / 40.0), center: true,
        color: f.color, bold: true, opacity: alpha);
  }

  void _drawMarkers(Canvas canvas, Size size) {
    final entryX = px(kWaypointGrid[0][0]);
    _drawText(canvas, '▼ 입구', Offset(entryX, 4),
        fontSize: 11 * cell / 40, center: true, color: const Color(0xDD69db7c));
    final exitX = px(kWaypointGrid.last[0]);
    _drawText(canvas, '▼ 기지', Offset(exitX, size.height - 4),
        fontSize: 11 * cell / 40, center: true,
        align: TextAlign.center, baseline: true, color: const Color(0xDDff6b6b));
  }

  void _drawPauseOverlay(Canvas canvas, Size size) {
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height),
        Paint()..color = const Color(0x77000000));
    _drawText(canvas, '⏸ 일시정지',
        Offset(size.width / 2, size.height / 2 - cell * 0.5),
        fontSize: 28 * cell / 40, center: true, bold: true,
        color: Colors.white.withOpacity(0.9));
    _drawText(canvas, '버튼으로 재개',
        Offset(size.width / 2, size.height / 2 + cell * 0.5),
        fontSize: 13 * cell / 40, center: true,
        color: Colors.white.withOpacity(0.45));
  }

  void _drawText(Canvas canvas, String text, Offset offset, {
    double fontSize = 14, bool center = false, Color? color,
    bool bold = false, double opacity = 1.0, TextAlign align = TextAlign.left,
    bool baseline = false,
  }) {
    final style = ui.TextStyle(
      color: (color ?? Colors.white).withOpacity(opacity),
      fontSize: fontSize,
      fontWeight: bold ? FontWeight.bold : FontWeight.normal,
    );
    final pb = ui.ParagraphBuilder(ui.ParagraphStyle(
      textAlign: center ? TextAlign.center : align,
    ))..pushStyle(style)..addText(text);
    final para = pb.build()..layout(ui.ParagraphConstraints(width: fontSize * text.length.toDouble() + 40));
    final dx = center ? offset.dx - para.maxIntrinsicWidth / 2 : offset.dx;
    final dy = baseline ? offset.dy - para.height : offset.dy - (center ? para.height / 2 : 0);
    canvas.drawParagraph(para, Offset(dx, dy));
  }

  @override
  bool shouldRepaint(covariant GamePainter old) => true;
}
