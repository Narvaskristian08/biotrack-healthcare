import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:biotrack_healthcare/core/theme/auth_theme_extensions.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';
import 'package:biotrack_healthcare/core/theme/app_radii.dart';
import 'package:biotrack_healthcare/core/theme/app_spacing.dart';
import 'package:biotrack_healthcare/features/auth/data/models/intro_model.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_action_bar.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_card.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_header.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_scaffold.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/onboarding_slide.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _controller = PageController();
  int _index = 0;

  static const List<IntroData> _slides = <IntroData>[
    IntroData(
      kicker: 'Daily Monitoring',
      title: 'Track Health Vitals Daily',
      description:
          'Use your phone to measure heart rate and monitor your basic health trends.',
      icon: Icons.monitor_heart_outlined,
      pills: <String>['Health Access', 'Real-Time Monitoring'],
      visualTitle: 'Daily check-ins from your device',
      visualPoints: <String>[
        'Measure heart rate in under a minute',
        'Review trends with clear daily summaries',
        'Built for first-time and routine use',
      ],
    ),
    IntroData(
      kicker: 'AI Health Guidance',
      title: 'Understand Your Health Readings',
      description:
          'Get simple AI-powered health summaries that help users interpret their data.',
      icon: Icons.insights_outlined,
      pills: <String>['Smart Insights', 'Easy Guidance'],
      visualTitle: 'Guidance designed to be easy to follow',
      visualPoints: <String>[
        'Plain-language summaries after each reading',
        'Helpful next-step guidance for everyday use',
        'Supports confident decisions without jargon',
      ],
    ),
    IntroData(
      kicker: 'Secure Records',
      title: 'Protect Your Medical Data',
      description:
          'Your health records are stored with verification and stronger data integrity.',
      icon: Icons.verified_user_outlined,
      pills: <String>['Data Protection', 'Verified Records'],
      visualTitle: 'Records built around trust and privacy',
      visualPoints: <String>[
        'Private patient access for sensitive data',
        'Verified record integrity for peace of mind',
        'Ready for trusted care coordination',
      ],
    ),
  ];

  bool get _isLastSlide => _index == _slides.length - 1;

  void _handleNext() {
    if (_isLastSlide) {
      context.go('/auth');
      return;
    }

    _controller.nextPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  Widget _buildDot(BuildContext context, bool active) {
    final authTheme = context.authTheme;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      width: active ? 28 : 9,
      height: 9,
      decoration: BoxDecoration(
        color: active ? AppColors.primaryGreen : authTheme.outlineStrong,
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;

    return AuthScaffold(
      child: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              0,
            ),
            child: Row(
              children: <Widget>[
                const AuthBrandMark(
                  compact: true,
                  subtitle: 'Trusted daily health tracking',
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => context.go('/auth'),
                  child: const Text('Skip'),
                ),
              ],
            ),
          ),
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: _slides.length,
              onPageChanged: (int value) => setState(() => _index = value),
              itemBuilder: (BuildContext context, int slideIndex) {
                return OnboardingSlide(data: _slides[slideIndex]);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              0,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            child: AuthCard(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Row(
                        children: List<Widget>.generate(
                          _slides.length,
                          (int dotIndex) => Padding(
                            padding: EdgeInsets.only(
                              right: dotIndex == _slides.length - 1
                                  ? 0
                                  : AppSpacing.xs,
                            ),
                            child: _buildDot(context, dotIndex == _index),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${_index + 1} of ${_slides.length}',
                        style: theme.labelLarge?.copyWith(
                          color: AppColors.primaryGreenDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    _isLastSlide
                        ? 'Securely access BioTrack to continue.'
                        : 'A quick look at how BioTrack supports care.',
                    style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AuthActionBar(
                    primaryLabel: _isLastSlide ? 'Get Started' : 'Next',
                    onPrimary: _handleNext,
                    primaryIcon: _isLastSlide
                        ? Icons.arrow_forward_rounded
                        : Icons.arrow_forward_rounded,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
