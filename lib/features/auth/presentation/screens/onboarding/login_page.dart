import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/core/constants/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/constants/app_colors.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min, // 🔹 centers vertically
              children: [
                // 🔹 Bigger logo
                Image.asset(
                  'assets/images/logo.png',
                  height: 250,
                ),

                const SizedBox(height: 24),

                // 🔹 Title
                const Text(
                  'Log in or Sign up',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkText,
                  ),
                ),

                const SizedBox(height: 8),

                // 🔹 Subtitle
                const SizedBox(
                  width: 300,
                  child: Text(
                    'Get smarter AI-driven health insights and securely track your vitals.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: AppColors.bodyText,
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // 🔹 Email field
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Email',
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 18,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // 🔹 Continue button
                PrimaryButton(
                  text: 'Continue',
                  onTap: () =>
                      Navigator.pushNamed(context, '/health-details'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
