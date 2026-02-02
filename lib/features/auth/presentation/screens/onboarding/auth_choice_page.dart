import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/core/constants/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/constants/app_colors.dart';

class AuthChoicePage extends StatelessWidget {
  const AuthChoicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),

            // ✅ Big centered logo (matches reference)
            Image.asset('assets/images/logo.png', height: 250),

            const Spacer(),

            // ✅ Bottom green card (buttons INSIDE)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              decoration: BoxDecoration(
                color: AppColors.lightGreen,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  // Sign Up button
                  PrimaryButton(
                    text: 'Sign Up',
                    onTap: () {
                      Navigator.pushNamed(context, '/signup');
                    },
                  ),

                  const SizedBox(height: 16),

                  // Log In button (outlined)
                  PrimaryButton(
                    text: 'Log In',
                    outlined: true,
                    onTap: () {
                      Navigator.pushNamed(context, '/login');
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
