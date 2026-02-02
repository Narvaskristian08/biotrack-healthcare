import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/common/widgets/primary_button.dart';

class HealthDetailsPage extends StatelessWidget {
  const HealthDetailsPage({super.key});

  Widget _fieldRow({required String label, required String hint}) {
    return Column(
      children: [
        Row(
          children: [
            // Left label
            Expanded(
              flex: 2,
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            const SizedBox(width: 12),

            // Right input field
            Expanded(
              flex: 3,
              child: TextField(
                decoration: InputDecoration(
                  hintText: hint,
                  filled: true,
                  fillColor: Colors.grey.shade200,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Divider
        Divider(color: Colors.grey.shade400, height: 1),

        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text(
                'Set up Health Details',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),

              const SizedBox(height: 12),

              const Text(
                'Your health details are the basic information the app needs to provide you relevant information.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey, height: 1.5),
              ),

              const SizedBox(height: 24),

              // Grey card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  children: [
                    _fieldRow(label: 'First Name', hint: 'Required'),
                    _fieldRow(label: 'Last Name', hint: 'Required'),
                    _fieldRow(label: 'Date of Birth', hint: 'Optional'),
                    _fieldRow(label: 'Sex', hint: 'Optional'),
                    _fieldRow(label: 'Height', hint: 'Optional'),
                    _fieldRow(label: 'Weight', hint: 'Optional'),
                  ],
                ),
              ),

              const Spacer(),

              PrimaryButton(
                text: 'Continue',
                onTap: () {
                  Navigator.pushReplacementNamed(context, '/main');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
