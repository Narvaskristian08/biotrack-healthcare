import 'package:flutter/material.dart';

class AiInsightsPage extends StatelessWidget {
  const AiInsightsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),

      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFFF4F8EF),
        elevation: 0,
        title: const Text(
          'AI Insights',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),

      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            children: [
              /// HEALTH INSIGHTS CARD
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    /// TITLE
                    const Text(
                      'Health Insights',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),

                    const SizedBox(height: 12),

                    /// QUESTION (LEFT-ALIGNED)
                    /// QUESTION (FORCED LEFT ALIGN)
                    SizedBox(
                      width: double.infinity, // gives left reference
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2F6CF6),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'What is my recent heart rate readings?',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    /// AI FEEDBACK CONTAINER (SEPARATE)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F3F5),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Text(
                        'Your recent heart rate readings were within a healthy range. '
                        'It\'s important to stay hydrated, stretch periodically, and maintain '
                        'moderate physical activity throughout the day to support overall '
                        'cardiovascular health.\n\n'
                        'Your heart rate patterns appear stable based on recent sensor data, '
                        'with no significant fluctuations detected during normal activity. '
                        'This suggests that your current activity level and rest balance are '
                        'well maintained.\n\n'
                        'Remember, this is not a medical diagnosis. If you experience symptoms '
                        'such as dizziness, shortness of breath, or prolonged fatigue, please '
                        'consult a qualified healthcare professional.\n\n'
                        'Maintaining regular movement, proper hydration, adequate sleep, and '
                        'balanced nutrition can help support consistent heart rate patterns '
                        'throughout the day.\n\n'
                        'No unusual activity or fall events were detected. Your movement and '
                        'activity patterns appear normal based on recent sensor and motion data.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black87,
                          height: 1.6,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              /// ASK QUESTION INPUT
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: [
                    const Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Ask a health question...',
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_upward),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
