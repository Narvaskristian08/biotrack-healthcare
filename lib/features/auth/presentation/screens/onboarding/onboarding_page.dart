import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:biotrack_healthcare/common/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _controller = PageController();
  int _index = 0;

  void _next() {
    if (_index < 3) {
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
      width: active ? 26 : 9,
      height: 9,
      decoration: BoxDecoration(
        color: active ? AppColors.primaryBlue : const Color(0xFFC9D4C5),
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF7FBF4), Color(0xFFE7F2DE)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Positioned(
            top: -120,
            right: -70,
            child: Container(
              height: 290,
              width: 290,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primaryBlue.withValues(alpha: 0.14),
              ),
            ),
          ),
          Positioned(
            bottom: 190,
            left: -80,
            child: Container(
              height: 230,
              width: 230,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFFCEE6BA),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => context.go('/auth'),
                        child: const Text(
                          'Skip',
                          style: TextStyle(
                            color: AppColors.primaryBlue,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: PageView(
                    controller: _controller,
                    onPageChanged: (value) => setState(() => _index = value),
                    children: const [
                      _IntroSlide(
                        title: 'Track Health Vitals Daily',
                        description:
                            'Use BioTrack to measure, monitor, and understand your wellbeing from your mobile phone.',
                        icon: Icons.favorite,
                      ),
                      _IntroSlide(
                        title: 'Private and Secure by Default',
                        description:
                            'Your records are encrypted, protected, and controlled by you at all times.',
                        icon: Icons.lock,
                      ),
                      _IntroSlide(
                        title: 'Smart Alerts and Insights',
                        description:
                            'Receive timely alerts, movement status, and AI-guided wellness insights.',
                        icon: Icons.insights,
                      ),
                      _IntroSlide(
                        title: 'Blockchain-Verified Records',
                        description:
                            'Important health records can be integrity-verified to build trust and traceability.',
                        icon: Icons.verified,
                      ),
                    ],
                  ),
                ),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 26),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.92),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    border: Border.all(color: const Color(0xFFD9E7D3)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _dot(_index == 0),
                          const SizedBox(width: 6),
                          _dot(_index == 1),
                          const SizedBox(width: 6),
                          _dot(_index == 2),
                          const SizedBox(width: 6),
                          _dot(_index == 3),
                        ],
                      ),
                      const SizedBox(height: 14),
                      if (_index == 0) ...[
                        const Icon(Icons.swipe, size: 22, color: Colors.grey),
                        const SizedBox(height: 6),
                        const Text(
                          'Swipe to continue',
                          style: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        const SizedBox(height: 14),
                      ],
                      PrimaryButton(
                        text: _index == 3 ? 'Get Started' : 'Continue',
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

class _IntroSlide extends StatelessWidget {
  const _IntroSlide({
    required this.title,
    required this.description,
    required this.icon,
  });

  final String title;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxHeight < 430;
        final heroSize = compact ? 150.0 : 230.0;
        final logoSize = compact ? 88.0 : 130.0;
        final titleSize = compact ? 21.0 : 25.0;
        final cardPadding = compact
            ? const EdgeInsets.fromLTRB(14, 14, 14, 14)
            : const EdgeInsets.fromLTRB(18, 20, 18, 18);

        return Padding(
          padding: const EdgeInsets.fromLTRB(22, 6, 22, 10),
          child: SingleChildScrollView(
            physics: const NeverScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  const SizedBox(height: 4),
                  Container(
                    width: heroSize,
                    height: heroSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE0F1D0), Color(0xFFBEDBA4)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryBlue.withValues(alpha: 0.2),
                          blurRadius: compact ? 24 : 40,
                          offset: Offset(0, compact ? 12 : 20),
                        ),
                      ],
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Image.asset('assets/images/logo.png', height: logoSize),
                        Positioned(
                          bottom: compact ? 16 : 28,
                          right: compact ? 18 : 34,
                          child: Container(
                            height: compact ? 34 : 42,
                            width: compact ? 34 : 42,
                            decoration: BoxDecoration(
                              color: AppColors.primaryBlue,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              icon,
                              color: Colors.white,
                              size: compact ? 18 : 23,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: cardPadding,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: Column(
                      children: [
                        Text(
                          title,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: titleSize,
                            fontWeight: FontWeight.w800,
                            color: AppColors.darkText,
                          ),
                        ),
                        SizedBox(height: compact ? 7 : 10),
                        Text(
                          description,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: compact ? 12.6 : 14,
                            height: 1.45,
                            color: AppColors.bodyText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
