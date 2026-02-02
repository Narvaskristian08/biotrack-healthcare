import 'package:flutter/material.dart';

class RecordsPage extends StatelessWidget {
  const RecordsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),

      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFFF4F8EF),
        elevation: 0,
        title: const Text(
          'Records',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),

      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          children: [
            /// FILTER + EXPORT
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    children: [
                      Text('Monthly', style: TextStyle(fontSize: 13)),
                      SizedBox(width: 4),
                      Icon(Icons.keyboard_arrow_down, size: 18),
                    ],
                  ),
                ),

                TextButton.icon(
                  onPressed: () {
                    // EXPORT ACTION (stub)
                  },
                  icon: const Icon(Icons.upload, size: 18),
                  label: const Text('EXPORT'),
                  style: TextButton.styleFrom(foregroundColor: Colors.green),
                ),
              ],
            ),

            const SizedBox(height: 16),

            /// CHART (IMAGE)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Image.asset(
                'assets/images/records_chart.png',
                fit: BoxFit.contain,
              ),
            ),

            const SizedBox(height: 20),

            /// FALL DETECTION SUMMARY
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.favorite, color: Colors.green, size: 59),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Fall Detection',
                        style: TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text('Monitoring', style: TextStyle(color: Colors.grey)),
                      SizedBox(height: 4),
                      Text(
                        'No falls detected\nMonthly summary',
                        style: TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            /// RECENT RECORDS
            const Text(
              'Recent Records',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),

            const SizedBox(height: 12),

            _recordItem(
              title: 'Heart Rate Scan',
              subtitle: 'Today',
              time: '10:42 AM',
            ),
            _recordItem(
              title: 'Activity Summary',
              subtitle: 'Moderate activity',
              time: '10:42 AM',
            ),
            _recordItem(
              title: 'AI Health Insights',
              subtitle: 'Wellness summary generated',
              time: '10:42 AM',
            ),
            _recordItem(
              title: 'Heart Rate Scan',
              subtitle: 'Today',
              time: '9:18 AM',
            ),
          ],
        ),
      ),
    );
  }

  /// SINGLE RECORD ROW
  static Widget _recordItem({
    required String title,
    required String subtitle,
    required String time,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.favorite, color: Colors.green),
      title: Text(title, style: const TextStyle(fontSize: 15)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 13)),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          /// TIME
          Text(
            time,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),

          /// BLOCKCHAIN VERIFIED
          const Text(
            'Blockchain verified',
            style: TextStyle(fontSize: 12, color: Colors.green),
          ),
        ],
      ),
    );
  }
}
