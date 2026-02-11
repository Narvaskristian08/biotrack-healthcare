import 'package:flutter_test/flutter_test.dart';

import 'package:biotrack_healthcare/main.dart';

void main() {
  testWidgets('Onboarding screen renders', (WidgetTester tester) async {
    await tester.pumpWidget(const BioTrackApp());
    expect(find.text('Swipe to continue'), findsOneWidget);
    expect(find.text('Welcome to BioTrack'), findsNothing);
  });
}
