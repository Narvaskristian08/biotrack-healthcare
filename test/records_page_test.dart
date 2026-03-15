import 'package:biotrack_healthcare/features/home/presentation/screens/records_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('RecordsPage renders loading and error states safely', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});

    await tester.pumpWidget(const MaterialApp(home: RecordsPage()));

    expect(find.text('Records'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('MEDICAL HISTORY'), findsOneWidget);
    expect(find.text('Could not load records'), findsOneWidget);
    expect(find.byType(ListView), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
