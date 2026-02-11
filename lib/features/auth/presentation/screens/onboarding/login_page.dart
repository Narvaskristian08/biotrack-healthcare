import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart'; 
import 'package:biotrack_healthcare/common/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';

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
          onPressed: () => context.pop(), 
        ),
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset('assets/images/logo.png', height: 250),

                const SizedBox(height: 24),

                const Text(
                  'Log in or Sign up',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkText,
                  ),
                ),

                const SizedBox(height: 8),

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

                PrimaryButton(
                  text: 'Continue',
                  onTap: () => context.go('/health-details'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
