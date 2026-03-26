import 'package:camera/camera.dart';

class FrameMetrics {
  const FrameMetrics({
    required this.redSignal,
    required this.greenSignal,
    required this.fingerConfidence,
  });
  final double redSignal;
  final double greenSignal;
  final double fingerConfidence;
}

class PPGProcessor {
  static const double _roiSizePercent = 0.28;
  static const int _sampleStride = 4;

  static FrameMetrics extractFrameMetrics(CameraImage image) {
    if (image.planes.isEmpty) {
      return const FrameMetrics(
        redSignal: 0,
        greenSignal: 0,
        fingerConfidence: 0,
      );
    }

    if (image.format.group == ImageFormatGroup.yuv420) {
      return _processYUV(image);
    } else {
      return _processBGRA(image);
    }
  }

  static FrameMetrics _processYUV(CameraImage image) {
    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];

    final int width = image.width;
    final int height = image.height;

    final int startX = (width * (1 - _roiSizePercent) / 2).toInt();
    final int startY = (height * (1 - _roiSizePercent) / 2).toInt();
    final int endX = (width * (1 + _roiSizePercent) / 2).toInt();
    final int endY = (height * (1 + _roiSizePercent) / 2).toInt();

    double totalY = 0, totalR = 0, totalG = 0, totalB = 0;
    int count = 0;
    final yBytesPerPixel = yPlane.bytesPerPixel ?? 1;
    final uBytesPerPixel = uPlane.bytesPerPixel ?? 1;
    final vBytesPerPixel = vPlane.bytesPerPixel ?? 1;

    for (int y = startY; y < endY; y += _sampleStride) {
      for (int x = startX; x < endX; x += _sampleStride) {
        final int yIndex = y * yPlane.bytesPerRow + x * yBytesPerPixel;
        final int uIndex =
            (y ~/ 2) * uPlane.bytesPerRow + (x ~/ 2) * uBytesPerPixel;
        final int vIndex =
            (y ~/ 2) * vPlane.bytesPerRow + (x ~/ 2) * vBytesPerPixel;

        final yValue = yPlane.bytes[yIndex].toDouble();
        final uValue = uPlane.bytes[uIndex].toDouble() - 128.0;
        final vValue = vPlane.bytes[vIndex].toDouble() - 128.0;

        final r = (yValue + 1.402 * vValue).clamp(0.0, 255.0);
        final g = (yValue - 0.344136 * uValue - 0.714136 * vValue).clamp(
          0.0,
          255.0,
        );
        final b = (yValue + 1.772 * uValue).clamp(0.0, 255.0);

        totalY += yValue;
        totalR += r;
        totalG += g;
        totalB += b;
        count++;
      }
    }

    final avgY = totalY / count;
    final avgR = totalR / count;
    final avgG = totalG / count;
    final avgB = totalB / count;

    final double redSignal = avgR / 255.0;
    final double greenSignal = avgG / 255.0;

    final double colorSum = avgR + avgG + avgB + 1.0;
    final double redRatio = (avgR / colorSum).clamp(0.0, 1.0);
    final double redDominance = ((avgR - ((avgG + avgB) / 2.0)) / (avgR + 1.0))
        .clamp(0.0, 1.0);
    final double brightnessLevel = ((avgY - 24.0) / 132.0).clamp(0.0, 1.0);
    final double saturation = ((avgR - avgB) / colorSum).clamp(0.0, 1.0);
    final double fingerConfidence =
        (redDominance * 0.44 +
        redRatio * 0.34 +
        saturation * 0.16 +
        brightnessLevel * 0.06);

    return FrameMetrics(
      redSignal: redSignal.clamp(0.0, 1.0),
      greenSignal: greenSignal.clamp(0.0, 1.0),
      fingerConfidence: fingerConfidence.clamp(0.0, 1.0),
    );
  }

  static FrameMetrics _processBGRA(CameraImage image) {
    final bytes = image.planes[0].bytes;
    final int width = image.width;
    final int height = image.height;

    final int startX = (width * (1 - _roiSizePercent) / 2).toInt();
    final int startY = (height * (1 - _roiSizePercent) / 2).toInt();
    final int endX = (width * (1 + _roiSizePercent) / 2).toInt();
    final int endY = (height * (1 + _roiSizePercent) / 2).toInt();

    double totalR = 0, totalG = 0, totalB = 0;
    int count = 0;

    for (int y = startY; y < endY; y += _sampleStride) {
      for (int x = startX; x < endX; x += _sampleStride) {
        final int index = y * image.planes[0].bytesPerRow + x * 4;
        totalB += bytes[index];
        totalG += bytes[index + 1];
        totalR += bytes[index + 2];
        count++;
      }
    }

    final avgR = totalR / count;
    final avgG = totalG / count;
    final avgB = totalB / count;

    final double redSignal = avgR / 255.0;
    final double greenSignal = avgG / 255.0;

    final double colorSum = avgR + avgG + avgB + 1.0;
    final double redRatio = (avgR / colorSum).clamp(0.0, 1.0);
    final double redOverGreen = ((avgR - avgG) / (avgR + 1)).clamp(0.0, 1.0);
    final double redOverBlue = ((avgR - avgB) / (avgR + 1)).clamp(0.0, 1.0);
    final double brightnessLevel =
        ((((avgR + avgG + avgB) / 3.0) - 24.0) / 132.0).clamp(0.0, 1.0);

    final double fingerConfidence =
        (redOverGreen * 0.28 +
        redOverBlue * 0.28 +
        redRatio * 0.34 +
        brightnessLevel * 0.10);

    return FrameMetrics(
      redSignal: redSignal.clamp(0.0, 1.0),
      greenSignal: greenSignal.clamp(0.0, 1.0),
      fingerConfidence: fingerConfidence.clamp(0.0, 1.0),
    );
  }
}
