import 'package:flutter/material.dart';

class ScanPage extends StatelessWidget {
  const ScanPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),

appBar: AppBar(
  backgroundColor: const Color(0xFFF4F8EF),
  elevation: 0,
  title: const Text(
    'Scan Vitals',
    style: TextStyle(
      color: Colors.black,
      fontWeight: FontWeight.w600,
    ),
  ),
  centerTitle: true,
),


      body: Column(
        children: [
          const SizedBox(height: 24),

          /// FINGER SCAN IMAGE
          Container(
            height: 260,
            width: 260,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1F2A1E),
              borderRadius: BorderRadius.circular(20),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                'assets/images/finger_scan.png',
                fit: BoxFit.cover,
              ),
            ),
          ),

          const SizedBox(height: 28),

          /// MEASURING TEXT (ALWAYS VISIBLE)
          const Text(
            'Measuring...',
            style: TextStyle(
              fontSize: 35,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 6),

          const Text(
            'About 15s',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),

          const SizedBox(height: 16),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: const Text(
              'Cover the camera and flash with your fingertip. '
              'Hold still and wait for the reading to complete.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                color: Colors.black54,
                height: 1.8,
              ),
            ),
          ),

          const Spacer(),

          /// START SCAN BUTTON (OPENS CAMERA)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: SizedBox(
              height: 45,
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // TODO: Open phone camera here
                  // Navigator.push(context, MaterialPageRoute(builder: (_) => CameraPage()));
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4C9A2A),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Start Scan',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
