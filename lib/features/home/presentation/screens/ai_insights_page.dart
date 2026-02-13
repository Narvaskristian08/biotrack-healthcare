import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class AiInsightsPage extends StatelessWidget {
  const AiInsightsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      backgroundColor: const Color(0xFFE0E8DB),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFFE0E8DB),
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'AI Insights',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 14),
          children: [
            const SizedBox(height: 62),
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF9ACC61),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Text(
                  'What is my recent heart rate readings?',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
              decoration: BoxDecoration(
                color: const Color(0xFFC9D7B7),
                borderRadius: BorderRadius.circular(13),
              ),
              child: RichText(
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 14.5,
                    height: 1.5,
                    color: Color(0xFF3A4134),
                  ),
                  children: [
                    TextSpan(
                      text:
                          'Your recent heart rate readings were within a healthy range. It\'s important to stay hydrated, stretch periodically, and maintain moderate activity throughout the day.\n',
                    ),
                    TextSpan(
                      text: 'Remember, this is not a medical diagnosis. ',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(
                      text:
                          'Please consult a healthcare professional with any serious concerns.\n',
                    ),
                    TextSpan(
                      text:
                          'Maintaining regular movement, proper hydration, and balanced rest can help support consistent heart rate patterns throughout the day.\n',
                    ),
                    TextSpan(
                      text:
                          'No unusual activity or fall events were detected. Your movement patterns appear normal based on recent sensor data.\n\n',
                    ),
                    TextSpan(
                      text:
                          'Your resting trend appears stable across recent sessions, with values staying within expected daily fluctuations. Continue spacing your physical activity and rest periods to avoid sharp spikes.\n\n',
                    ),
                    TextSpan(
                      text:
                          'For better long-term heart health monitoring, take measurements at a similar time each day and avoid scanning immediately after heavy activity. This can improve consistency in your baseline readings.\n\n',
                    ),
                    TextSpan(
                      text:
                          'Lifestyle reminders: drink water regularly, limit excessive caffeine late in the day, and maintain 7-8 hours of quality sleep when possible. These habits can support stable cardiovascular patterns.\n\n',
                    ),
                    TextSpan(
                      text:
                          'If you notice persistent elevated readings, irregular rhythm alerts, chest discomfort, dizziness, or shortness of breath, seek medical attention promptly for proper clinical evaluation.\n\n',
                    ),
                    TextSpan(
                      text:
                          'Current summary: no critical pattern detected, overall status remains monitored and stable based on available sensor history.',
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: AnimatedPadding(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: EdgeInsets.fromLTRB(10, 0, 10, keyboardInset + 14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFE8E8E8),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              const Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Ask a health question...',
                    hintStyle: TextStyle(
                      color: Color(0xFF9A9A9A),
                      fontSize: 16,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 10),
                  ),
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.darkText,
                  ),
                ),
              ),
              IconButton(
                onPressed: () {},
                icon: const Icon(
                  Icons.arrow_upward,
                  color: Color(0xFF1E1E1E),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
