import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:biotrack_healthcare/common/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';

class AuthChoicePage extends StatelessWidget {
  const AuthChoicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF6FBF2), Color(0xFFE8F4DD)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Positioned(
            top: -110,
            right: -60,
            child: Container(
              height: 260,
              width: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primaryBlue.withValues(alpha: 0.14),
              ),
            ),
          ),
          Positioned(
            bottom: 210,
            left: -70,
            child: Container(
              height: 190,
              width: 190,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFFCFE7B9),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  const SizedBox(height: 24),
                  Text(
                    'BioTrack',
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryBlue.withValues(alpha: 0.95),
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Secure health sensing for every family.',
                    style: TextStyle(
                      color: Color(0xFF5C6959),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE0F1D0), Color(0xFFBEDBA4)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryBlue.withValues(alpha: 0.18),
                          blurRadius: 40,
                          offset: const Offset(0, 18),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Image.asset('assets/images/logo.png', height: 130),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 26),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(
                        color: const Color(0xFFD8E7D2),
                        width: 1.2,
                      ),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Get Started',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: AppColors.darkText,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Use your patient account or create a new one linked to your health center.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.bodyText,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 18),
                        PrimaryButton(
                          text: 'Create Patient Account',
                          onTap: () => context.go('/signup'),
                        ),
                        const SizedBox(height: 12),
                        PrimaryButton(
                          text: 'Log In',
                          outlined: true,
                          onTap: () => context.go('/login'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
