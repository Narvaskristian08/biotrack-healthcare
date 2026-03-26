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
      // Android 10+ needs Activity Recognition, older might need Sensors
      final activity = await _request(Permission.activityRecognition);
      if (activity) return true;
      return _request(Permission.sensors);
    }
    
    // On iOS, sensors status check ensures NSMotionUsageDescription is set
    return _request(Permission.sensors);
  }

  static Future<bool> requestNotificationPermission() async {
    return _request(Permission.notification);
  }

  /// Requests all core permissions needed for the Vitals Scan.
  /// Note: These will trigger sequentially to avoid UI conflicts with OS dialogs.
  static Future<PermissionSnapshot> requestCorePermissions() async {
    return PermissionSnapshot(
      cameraGranted: await requestCameraPermission(),
      motionGranted: await requestMotionPermission(),
      notificationGranted: await requestNotificationPermission(),
    );
  }

  /// Helper to check if a permission is functionally granted.
  static Future<bool> _request(Permission permission) async {
    final status = await permission.request();
    // .isLimited is common on iOS (e.g., Photos), but treated as granted for logic flow.
    return status.isGranted || status.isLimited;
  }
  
  /// Useful for checking state without triggering a popup
  static Future<PermissionSnapshot> checkCurrentStatus() async {
    return PermissionSnapshot(
      cameraGranted: await Permission.camera.status.isGranted,
      motionGranted: await Permission.sensors.status.isGranted,
      notificationGranted: await Permission.notification.status.isGranted,
    );
  }
}