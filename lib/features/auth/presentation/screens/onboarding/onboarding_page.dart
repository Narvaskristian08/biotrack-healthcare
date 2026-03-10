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
  
  static const List<_IntroData> _slides = [
    _IntroData(
      kicker: 'Daily Monitoring',
      title: 'Track Health Vitals Daily',
      description:
          'Measure, monitor, and understand your wellbeing from your phone with guided daily check-ins.',
      icon: Icons.favorite_rounded,
      pills: ['Health Access', 'Realtime Monitoring'],
    ),
    _IntroData(
      kicker: 'Privacy First',
      title: 'Private and Secure by Default',
      description:
          'Your records stay encrypted, protected, and controlled by you across every login and session.',
      icon: Icons.shield_rounded,
      pills: ['Secure Login', 'Role-Based Access'],
    ),
    _IntroData(
      kicker: 'Smart Insights',
      title: 'Receive Timely Alerts',
      description:
          'Get movement status updates and AI-guided wellness signals so you can act sooner.',
      icon: Icons.insights_rounded,
      pills: ['Early Alerts', 'Actionable Guidance'],
    ),
    _IntroData(
      kicker: 'Trusted Records',
      title: 'Integrity-Verified Health Data',
      description:
          'Important records can be verified for stronger trust between patients and care teams.',
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
    // Detect small screens to adjust padding
    final bool isSmallScreen = MediaQuery.of(context).size.height < 700;

    return Scaffold(
      body: Stack(
        children: [
          const _AuthBackdrop(),
          SafeArea(
            child: Column(
              children: [
                // Header
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
                              height: 28, width: 28,
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
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.darkText),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => context.go('/auth'),
                        child: const Text(
                          'Skip',
                          style: TextStyle(color: Color(0xFF0F8F60), fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content
                Expanded(
                  child: PageView.builder(
                    controller: _controller,
                    onPageChanged: (value) => setState(() => _index = value),
                    itemCount: _slides.length,
                    itemBuilder: (context, itemIndex) {
                      return _IntroSlide(
                        data: _slides[itemIndex],
                        position: itemIndex + 1,
                        total: _slides.length,
                      );
                    },
                  ),
                ),

                // Consistent Bottom Navigation Container
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
                    mainAxisSize: MainAxisSize.min, // Fixes vertical growth
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _slides.length,
                          (idx) => Padding(
                            padding: EdgeInsets.only(
                              right: idx == _slides.length - 1 ? 0 : 6,
                            ),
                            child: _dot(_index == idx),
                          ),
                        ),
                      ),
                      
                      // Uniform spacing: No more jumping logic here
                      const SizedBox(height: 18),

                      PrimaryButton(
                        text: _index == _slides.length - 1
                            ? 'Start with BioTrack'
                            : 'Continue',
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

class _IntroData {
  const _IntroData({
    required this.kicker,
    required this.title,
    required this.description,
    required this.icon,
    required this.pills,
  });

  final String kicker;
  final String title;
  final String description;
  final IconData icon;
  final List<String> pills;
}

class _IntroSlide extends StatelessWidget {
  const _IntroSlide({
    required this.data,
    required this.position,
    required this.total,
  });

  final _IntroData data;
  final int position;
  final int total;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final bool isShort = constraints.maxHeight < 550;

        return SingleChildScrollView(
          // This allows the content to scroll if it's too long for the screen
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(99),
                    color: Colors.white.withValues(alpha: 0.82),
                    border: Border.all(color: const Color(0xFFCBE5D8)),
                  ),
                  child: Text(
                    'Step $position of $total',
                    style: const TextStyle(
                      color: Color(0xFF0F7A4E),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              SizedBox(height: isShort ? 8 : 12),
              
              // Title Card
              _buildTitleCard(isShort),

              SizedBox(height: isShort ? 10 : 14),
              
              // Description Card (Removed Expanded here)
              _buildDetailsCard(isShort),
              
              // Buffer for the bottom nav
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTitleCard(bool isShort) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isShort ? 14 : 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          colors: [Color(0xFF1CAA6D), Color(0xFF0E7A4E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.kicker.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFBFF2D8),
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  data.title,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: isShort ? 20 : 24,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Icon(data.icon, color: Colors.white, size: isShort ? 32 : 40),
        ],
      ),
    );
  }

  Widget _buildDetailsCard(bool isShort) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isShort ? 14 : 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: Colors.white.withValues(alpha: 0.95),
        border: Border.all(color: const Color(0xFFCEE5D9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Why it matters',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.darkText),
          ),
          const SizedBox(height: 8),
          Text(
            data.description,
            style: TextStyle(
              fontSize: isShort ? 13 : 14.2,
              height: 1.45,
              color: AppColors.bodyText,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: data.pills.map((pill) => _buildPill(pill)).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildPill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(99),
        color: const Color(0xFFEAF8F1).withValues(alpha: 0.95),
        border: Border.all(color: const Color(0xFFBCE6D2)),
      ),
      child: Text(
        text,
        style: const TextStyle(color: Color(0xFF136A47), fontWeight: FontWeight.w600, fontSize: 11.4),
      ),
    );
  }
}