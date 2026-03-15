import 'package:biotrack_healthcare/features/home/data/services/ppg_signal_conditioner.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ppg signal conditioner returns a detrended red-channel waveform', () {
    final conditioner = PpgSignalConditioner(
      baselineWindowMs: 1500,
      minSamplesForSignal: 5,
    );

    double? latest;
    for (var i = 0; i < 12; i++) {
      latest = conditioner.addSample(
        timestampMs: i * 90,
        redSignal: 0.74 + ((i.isEven ? 1 : -1) * 0.015),
        greenSignal: 0.58,
      );
    }

    expect(latest, isNotNull);
    expect(latest!.abs(), greaterThan(0.005));
    expect(latest.abs(), lessThan(0.08));
  });

  test(
    'ppg signal conditioner rejects samples when red does not dominate green',
    () {
      final conditioner = PpgSignalConditioner(
        baselineWindowMs: 1500,
        minSamplesForSignal: 4,
      );

      double? latest;
      for (var i = 0; i < 8; i++) {
        latest = conditioner.addSample(
          timestampMs: i * 90,
          redSignal: 0.46,
          greenSignal: 0.47,
        );
      }

      expect(latest, isNull);
    },
  );
}
