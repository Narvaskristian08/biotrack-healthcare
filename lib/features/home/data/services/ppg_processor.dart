import 'dart:math' as math;
import 'package:camera/camera.dart';

class FrameMetrics {
  const FrameMetrics({required this.intensity, required this.fingerConfidence});

  final double intensity;
  final double fingerConfidence;
}

class PPGProcessor {
  static FrameMetrics extractFrameMetrics(CameraImage image) {
    if (image.planes.isEmpty) {
      return const FrameMetrics(intensity: 0, fingerConfidence: 0);
    }

    if (image.format.group == ImageFormatGroup.yuv420) {
      final yBytes = image.planes[0].bytes;
      final uBytes = image.planes.length > 1 ? image.planes[1].bytes : yBytes;
      final vBytes = image.planes.length > 2 ? image.planes[2].bytes : yBytes;

      var sumY = 0;
      var sumU = 0;
      var sumV = 0;
      var count = 0;
      var redLikeCount = 0;

      for (var i = 0; i < yBytes.length; i += 24) {
        sumY += yBytes[i];
        count++;
      }

      for (var i = 0; i < uBytes.length; i += 8) {
        sumU += uBytes[i];
      }
      for (var i = 0; i < vBytes.length; i += 8) {
        sumV += vBytes[i];
      }

      final avgY = count == 0 ? 0.0 : (sumY / count);
      final avgU = sumU / math.max(1, uBytes.length ~/ 8);
      final avgV = sumV / math.max(1, vBytes.length ~/ 8);
      final redChroma = (avgV - avgU).clamp(-128.0, 128.0);

      final uvCount = math.min(uBytes.length, vBytes.length);
      for (var i = 0; i < uvCount; i += 12) {
        final redLike = (vBytes[i] - uBytes[i]) > 12;
        if (redLike && avgY > 55) {
          redLikeCount++;
        }
      }

      final coverageScore = redLikeCount / math.max(1, uvCount ~/ 12);
      final redDominance = ((avgV - avgU - 8) / 70).clamp(0.0, 1.0).toDouble();
      final brightnessScore = ((avgY - 45) / 150).clamp(0.0, 1.0).toDouble();
      final fingerConfidence =
          (0.5 * redDominance + 0.3 * coverageScore + 0.2 * brightnessScore)
              .clamp(0.0, 1.0)
              .toDouble();
      final yNorm = (avgY / 255).clamp(0.0, 1.0).toDouble();
      final redNorm = ((redChroma + 128) / 256).clamp(0.0, 1.0).toDouble();
      final intensity = (0.45 * yNorm + 0.55 * redNorm).clamp(0.0, 1.0);

      return FrameMetrics(
        intensity: intensity.toDouble(),
        fingerConfidence: fingerConfidence,
      );
    }

    final bytes = image.planes.first.bytes;
    var sumLuma = 0.0;
    var sumR = 0.0;
    var sumG = 0.0;
    var count = 0;
    var redPixelCount = 0;

    for (var i = 0; i + 3 < bytes.length; i += 24) {
      final b = bytes[i].toDouble();
      final g = bytes[i + 1].toDouble();
      final r = bytes[i + 2].toDouble();
      sumLuma += (0.114 * b + 0.587 * g + 0.299 * r);
      sumR += r;
      sumG += g;
      if (r > g * 1.12 && r > b * 1.25 && r > 75) {
        redPixelCount++;
      }
      count++;
    }

    if (count == 0) {
      return const FrameMetrics(intensity: 0, fingerConfidence: 0);
    }

    final avgR = sumR / count;
    final avgG = sumG / count;
    final avgLuma = sumLuma / count;
    final redDominance = ((avgR - avgG) / 80).clamp(0.0, 1.0).toDouble();
    final coverageScore = (redPixelCount / count).clamp(0.0, 1.0).toDouble();
    final brightnessScore = (avgLuma / 255).clamp(0.0, 1.0).toDouble();
    final fingerConfidence =
        (0.45 * redDominance + 0.35 * coverageScore + 0.2 * brightnessScore)
            .clamp(0.0, 1.0)
            .toDouble();
    final intensity = ((avgR * 0.7) + (avgG * 0.3)) / 255;

    return FrameMetrics(
      intensity: intensity.clamp(0.0, 1.0).toDouble(),
      fingerConfidence: fingerConfidence,
    );
  }
}