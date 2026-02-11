import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart'; 
import 'package:biotrack_healthcare/common/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';

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
            Image.asset('assets/images/logo.png', height: 250),
            const Spacer(),
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
                  PrimaryButton(
                    text: 'Sign Up',
                    onTap: () {
                      context.go('/signup'); 
                    },
                  ),
                  const SizedBox(height: 16),
                  PrimaryButton(
                    text: 'Log In',
                    outlined: true,
                    onTap: () {
                      context.go('/login'); 
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
