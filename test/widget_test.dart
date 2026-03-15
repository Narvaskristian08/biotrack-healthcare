import 'package:flutter_test/flutter_test.dart';

import 'package:biotrack_healthcare/main.dart';

void main() {
  testWidgets('Onboarding screen renders', (WidgetTester tester) async {
    await tester.pumpWidget(const BioTrackApp());
    await tester.pumpAndSettle();

    expect(find.text('BioTrack'), findsOneWidget);
    expect(find.text('Track Health Vitals Daily'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });
}
