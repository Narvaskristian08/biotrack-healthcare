import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AppLineChart extends StatelessWidget {
  const AppLineChart({
    super.key,
    required this.values,
    this.color = AppColors.primaryGreen,
  });

  final List<double> values;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _AppLineChartPainter(values: values, color: color),
      child: const SizedBox.expand(),
    );
  }
}

class _AppLineChartPainter extends CustomPainter {
  const _AppLineChartPainter({required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppColors.mutedBorder
      ..strokeWidth = 1;

    for (var index = 1; index <= 3; index++) {
      final y = size.height * (index / 4);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    if (values.length < 2) {
      return;
    }

    final minValue = values.reduce(math.min);
    final maxValue = values.reduce(math.max);
    final range = (maxValue - minValue).abs() < 1 ? 1.0 : maxValue - minValue;
    const inset = 12.0;

    Offset pointFor(int index, double value) {
      final x =
          inset + ((size.width - (inset * 2)) * index / (values.length - 1));
      final normalized = (value - minValue) / range;
      final y =
          size.height - inset - ((size.height - (inset * 2)) * normalized);
      return Offset(x, y);
    }

    final linePath = Path();
    final fillPath = Path();
    for (var index = 0; index < values.length; index++) {
      final point = pointFor(index, values[index]);
      if (index == 0) {
        linePath.moveTo(point.dx, point.dy);
        fillPath
          ..moveTo(point.dx, size.height - inset)
          ..lineTo(point.dx, point.dy);
      } else {
        linePath.lineTo(point.dx, point.dy);
        fillPath.lineTo(point.dx, point.dy);
      }
    }
    final lastPoint = pointFor(values.length - 1, values.last);
    fillPath
      ..lineTo(lastPoint.dx, size.height - inset)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[
          color.withValues(alpha: 0.22),
          color.withValues(alpha: 0.02),
        ],
      ).createShader(Offset.zero & size);
    canvas.drawPath(fillPath, fillPaint);

    final linePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = 3;
    canvas.drawPath(linePath, linePaint);

    final dotPaint = Paint()..color = color;
    final haloPaint = Paint()..color = color.withValues(alpha: 0.14);
    canvas.drawCircle(lastPoint, 8, haloPaint);
    canvas.drawCircle(lastPoint, 4, dotPaint);
  }

  @override
  bool shouldRepaint(covariant _AppLineChartPainter oldDelegate) {
    if (oldDelegate.values.length != values.length ||
        oldDelegate.color != color) {
      return true;
    }
    for (var index = 0; index < values.length; index++) {
      if (oldDelegate.values[index] != values[index]) {
        return true;
      }
    }
    return false;
  }
}
