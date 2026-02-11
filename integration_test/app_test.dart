// This is a basic Flutter widget test for BioTrack.
//
// This test simulates a user flow through the app. 
// It uses the WidgetTester utility from flutter_test to interact with widgets.
// You can tap buttons, enter text, scroll, and verify UI states.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:biotrack_healthcare/main.dart';

void main() {
  testWidgets('Login and navigate to Scan screen', (WidgetTester tester) async {
    // Build the app and trigger the first frame.
    await tester.pumpWidget(const BioTrackApp());

    // Verify that the login screen appears.
    expect(find.text('Login'), findsOneWidget);

    // Enter email and password
    final emailField = find.byKey(const Key('login_email'));
    final passwordField = find.byKey(const Key('login_password'));
    final loginButton = find.byKey(const Key('login_button'));

    await tester.enterText(emailField, 'testuser@example.com');
    await tester.enterText(passwordField, 'password123');

    // Tap the login button
    await tester.tap(loginButton);
    await tester.pumpAndSettle();

    // Verify navigation to HomeScreen
    expect(find.text('Home'), findsOneWidget);

    // Navigate to ScanScreen
    final scanButton = find.byKey(const Key('scan_button'));
    await tester.tap(scanButton);
    await tester.pumpAndSettle();

    // Verify ScanScreen appears
    expect(find.text('Start Scan'), findsOneWidget);

    // Simulate starting a scan
    final startScanButton = find.byKey(const Key('start_scan_button'));
    await tester.tap(startScanButton);
    await tester.pumpAndSettle();

    // Verify scan results appear
    expect(find.textContaining('Scan Result'), findsOneWidget);
  });
}
