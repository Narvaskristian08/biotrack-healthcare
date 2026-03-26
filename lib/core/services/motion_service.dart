import 'dart:async';
import 'dart:math' as math;
import 'package:sensors_plus/sensors_plus.dart';

class MotionService {
  StreamSubscription<AccelerometerEvent>? _accelerometerSub;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSub;

  double movementIntensity = 0;
  double gyroMagnitude = 0;
  bool fallDetected = false;
  DateTime? _impactDetectedAt;

  void Function(String)? onError;
  void Function()? onUpdate;

  void startTracking() {
    _resetState();

    _accelerometerSub = accelerometerEventStream().listen(
      (event) {
        final magnitude = math.sqrt(
          event.x * event.x + event.y * event.y + event.z * event.z,
        );
        movementIntensity = (magnitude - 9.81).abs();
        
        if (magnitude > 24) {
          _impactDetectedAt = DateTime.now();
        }

        final hasRecentImpact = _impactDetectedAt != null &&
            DateTime.now().difference(_impactDetectedAt!) < const Duration(seconds: 2);
        
        if (hasRecentImpact && movementIntensity < 1.3) {
          fallDetected = true;
        }

        onUpdate?.call();
      },
      onError: (e) => onError?.call('Accelerometer unavailable.'),
    );

    _gyroscopeSub = gyroscopeEventStream().listen(
      (event) {
        gyroMagnitude = math.sqrt(
          event.x * event.x + event.y * event.y + event.z * event.z,
        );
        onUpdate?.call();
      },
      onError: (e) => onError?.call('Gyroscope unavailable.'),
    );
  }

  void stopTracking() {
    _accelerometerSub?.cancel();
    _gyroscopeSub?.cancel();
  }

  void _resetState() {
    movementIntensity = 0;
    gyroMagnitude = 0;
    fallDetected = false;
    _impactDetectedAt = null;
  }

  String get movementLabel {
    if (movementIntensity < 1.0) return 'Low';
    if (movementIntensity < 2.8) return 'Moderate';
    return 'High';
  }
}