import 'dart:io';

import 'package:permission_handler/permission_handler.dart';

class PermissionSnapshot {
  const PermissionSnapshot({
    required this.cameraGranted,
    required this.motionGranted,
    required this.notificationGranted,
  });

  final bool cameraGranted;
  final bool motionGranted;
  final bool notificationGranted;

  bool get allGranted => cameraGranted && motionGranted && notificationGranted;
}

class PermissionService {
  static Future<bool> requestCameraPermission() async {
    return _request(Permission.camera);
  }

  static Future<bool> requestMotionPermission() async {
    if (Platform.isAndroid) {
      final activity = await _request(Permission.activityRecognition);
      if (activity) {
        return true;
      }
      return _request(Permission.sensors);
    }

    // iOS motion data is handled by CoreMotion and usage description.
    return true;
  }

  static Future<bool> requestNotificationPermission() async {
    if (Platform.isAndroid) {
      final sdkStatus = await Permission.notification.status;
      if (sdkStatus.isGranted || sdkStatus.isLimited) {
        return true;
      }
    }
    return _request(Permission.notification);
  }

  static Future<PermissionSnapshot> requestCorePermissions() async {
    final cameraGranted = await requestCameraPermission();
    final motionGranted = await requestMotionPermission();
    final notificationGranted = await requestNotificationPermission();

    return PermissionSnapshot(
      cameraGranted: cameraGranted,
      motionGranted: motionGranted,
      notificationGranted: notificationGranted,
    );
  }

  static Future<bool> _request(Permission permission) async {
    final status = await permission.request();
    return status.isGranted || status.isLimited;
  }
}
