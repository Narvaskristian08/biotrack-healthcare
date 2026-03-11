import 'package:camera/camera.dart';

class FrameMetrics {
  const FrameMetrics({required this.intensity, required this.fingerConfidence});
  final double intensity;
  final double fingerConfidence;
}

class PPGProcessor {
  static const double _roiSizePercent = 0.4; 
  static const int _sampleStride = 4;        

  static FrameMetrics extractFrameMetrics(CameraImage image) {
    if (image.planes.isEmpty) return const FrameMetrics(intensity: 0, fingerConfidence: 0);

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

    double totalY = 0, totalU = 0, totalV = 0;
    int count = 0;

    for (int y = startY; y < endY; y += _sampleStride) {
      for (int x = startX; x < endX; x += _sampleStride) {
        final int yIndex = y * width + x;
        final int uvIndex = (y ~/ 2) * (uPlane.bytesPerRow) + (x ~/ 2) * (uPlane.bytesPerPixel ?? 1);

        totalY += yPlane.bytes[yIndex];
        totalU += uPlane.bytes[uvIndex];
        totalV += vPlane.bytes[uvIndex];
        count++;
      }
    }

    final avgY = totalY / count;
    final avgU = totalU / count;
    final avgV = totalV / count;

    // Green component is best for heart rate SNR (Signal-to-Noise Ratio)
    final double greenComponent = avgY - 0.344 * (avgU - 128) - 0.714 * (avgV - 128);
    
    final double redDominance = (avgV - avgU).clamp(0, 100) / 100.0;
    final double brightnessLevel = (avgY / 255.0).clamp(0.0, 1.0);
    final double fingerConfidence = (redDominance * 0.7 + brightnessLevel * 0.3);

    return FrameMetrics(
      intensity: greenComponent / 255.0,
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
        final int index = (y * width + x) * 4;
        totalB += bytes[index];
        totalG += bytes[index + 1];
        totalR += bytes[index + 2];
        count++;
      }
    }

    final avgR = totalR / count;
    final avgG = totalG / count;
    final avgB = totalB / count; 

    final double intensity = avgG / 255.0;

    final double redOverGreen = ((avgR - avgG) / (avgR + 1)).clamp(0.0, 1.0);
    final double redOverBlue = ((avgR - avgB) / (avgR + 1)).clamp(0.0, 1.0);
    
    final double fingerConfidence = (redOverGreen * 0.4 + redOverBlue * 0.4 + (avgR / 255.0) * 0.2);

    return FrameMetrics(
      intensity: intensity,
      fingerConfidence: fingerConfidence.clamp(0.0, 1.0),
    );
  }
}