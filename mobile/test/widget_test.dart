import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:hims_mobile/main.dart';
import 'package:hims_mobile/screens/login_screen.dart';

void main() {
  testWidgets('renders the Healthezee login shell',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tenantsProvider.overrideWith((ref) async {
            return [
              {'id': '1', 'name': 'City Clinic'},
            ];
          }),
        ],
        child: const HealthezeeApp(),
      ),
    );
    await tester.pump();

    expect(find.text('Healthezee'), findsOneWidget);
    expect(find.text('Professional Clinical Suite'), findsOneWidget);
  });
}
