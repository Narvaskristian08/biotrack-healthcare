import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/scan_record.dart';

class ScanRecordStore {
  static const String _recordsKey = 'home.scan_records';
  static const int _maxRecords = 60;

  static Future<List<ScanRecord>> list() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_recordsKey);
    if (raw == null || raw.trim().isEmpty) {
      return <ScanRecord>[];
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return <ScanRecord>[];
      }

      final records = decoded
          .whereType<Map>()
          .map((item) => item.map(
                (key, value) => MapEntry(key.toString(), value),
              ))
          .map(ScanRecord.fromJson)
          .toList(growable: false);

      records.sort((a, b) => b.scannedAt.compareTo(a.scannedAt));
      return records;
    } catch (_) {
      return <ScanRecord>[];
    }
  }

  static Future<void> add(ScanRecord record) async {
    final prefs = await SharedPreferences.getInstance();
    final records = await list();
    final updated = <ScanRecord>[record, ...records];
    if (updated.length > _maxRecords) {
      updated.removeRange(_maxRecords, updated.length);
    }

    final encoded = jsonEncode(updated.map((item) => item.toJson()).toList());
    await prefs.setString(_recordsKey, encoded);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_recordsKey);
  }
}
