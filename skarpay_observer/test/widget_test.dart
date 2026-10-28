import 'package:flutter_test/flutter_test.dart';
import 'package:skarpay_observer/main.dart';

void main() {
  testWidgets('App builds', (WidgetTester tester) async {
    await tester.pumpWidget(const SkarPayObserverApp());
    expect(find.text('SkarPay Observer'), findsOneWidget);
  });
}
