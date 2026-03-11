import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:biotrack_healthcare/common/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';

import 'package:biotrack_healthcare/features/auth/presentation/widgets/intro_slide.dart';
import 'package:biotrack_healthcare/features/auth/data/models/intro_model.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _controller = PageController();
  int _index = 0;

  static const List<IntroData> _slides = [
    IntroData(
      kicker: 'Daily Monitoring',
      title: 'Track Health Vitals Daily',
      description: 'Effortlessly track your vitals and visualize your progress with guided mobile check-ins.',
      icon: Icons.favorite_rounded,
      pills: ['Health Access', 'Realtime Monitoring'],
    ),
    IntroData(
      kicker: 'Privacy First',
      title: 'Private and Secure by Default',
      description: 'Security isnt an afterthought its the foundation. Your records are encrypted and always under your control',
      icon: Icons.shield_rounded,
      pills: ['Secure Login', 'Role-Based Access'],
    ),
    IntroData(
      kicker: 'Smart Insights',
      title: 'Receive Timely Alerts',
      description: 'Move from tracking to acting. Receive instant alerts and AI-driven signals when your body needs attention.',
      icon: Icons.insights_rounded,
      pills: ['Early Alerts', 'Actionable Guidance'],
    ),
    IntroData(
      kicker: 'Trusted Records',
      title: 'Integrity-Verified Health Data',
      description: 'Share with confidence. We verify the integrity of your data for more accurate, trusted care outcomes.',
      icon: Icons.verified_rounded,
      pills: ['Care Continuity', 'Data Integrity'],
    ),
  ];

  void _next() {
    if (_index < _slides.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 340),
        curve: Curves.easeOutCubic,
      );
      return;
    }
    context.go('/auth');
  }

  Widget _dot(bool active) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      width: active ? 28 : 9,
      height: 9.5,
      decoration: BoxDecoration(
        gradient: active
            ? const LinearGradient(
                colors: [Color(0xFF12935F), Color(0xFF33C481)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              )
            : null,
        color: active ? null : const Color(0xFFC9D4C5),
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isSmallScreen = MediaQuery.of(context).size.height < 700;

    return Scaffold(
      body: Stack(
        children: [
          const _AuthBackdrop(),
          SafeArea(
            child: Column(
              children: [
                // Restored BioTrack Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(99),
                          color: Colors.white.withValues(alpha: 0.84),
                          border: Border.all(color: const Color(0xFFBDE2CE), width: 1),
                        ),
                        child: Row(
                          children: [
                            Container(
                              height: 28,
                              width: 28,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [Color(0xFF12935F), Color(0xFF33C481)],
                                ),
                              ),
                              child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 16),
                            ),
                            const SizedBox(width: 9),
                            const Text(
                              'BioTrack',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors.darkText,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => context.go('/auth'),
                        child: const Text(
                          'SKIP',
                          style: TextStyle(
                            color: Color(0xFF0F8F60),
                            fontFamily: 'Inter',
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: PageView.builder(
                    controller: _controller,
                    onPageChanged: (value) => setState(() => _index = value),
                    itemCount: _slides.length,
                    itemBuilder: (context, itemIndex) {
                      return IntroSlide(data: _slides[itemIndex]);
                    },
                  ),
                ),

                // Bottom Navigation Container
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.fromLTRB(20, 14, 20, isSmallScreen ? 16 : 24),
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.94),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: const Color(0xFFD0E7DA)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F6F48).withValues(alpha: 0.08),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _slides.length,
                          (idx) => Padding(
                            padding: EdgeInsets.only(right: idx == _slides.length - 1 ? 0 : 6),
                            child: _dot(_index == idx),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      PrimaryButton(
                        text: _index == _slides.length - 1 ? 'Start with BioTrack' : 'Continue',
                        onTap: _next,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFEFF8F2), Color(0xFFDCEFE1)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        Positioned(
          top: -150,
          right: -78,
          child: Container(
            height: 320,
            width: 320,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF20AA6D).withValues(alpha: 0.16),
            ),
          ),
        ),
        Positioned(
          top: 180,
          left: -95,
          child: Container(
            height: 245,
            width: 245,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFB5E1C9).withValues(alpha: 0.68),
            ),
          ),
        ),
        Positioned(
          bottom: -120,
          right: -54,
          child: Container(
            height: 260,
            width: 260,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryBlue.withValues(alpha: 0.14),
            ),
          ),
        ),
      ],
    );
  }
}
