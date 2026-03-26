import 'package:biotrack_healthcare/features/home/domain/vitals_scanner_logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'calculateStableMedianBpm returns median for consistent recent windows',
    () {
      final bpm = VitalsScannerLogic.calculateStableMedianBpm(<int>[
        81,
        79,
        83,
      ]);
      expect(bpm, 81);
    },
  );

  test('calculateStableMedianBpm rejects inconsistent recent windows', () {
    final bpm = VitalsScannerLogic.calculateStableMedianBpm(<int>[82, 98, 126]);
    expect(bpm, isNull);
  });
}
