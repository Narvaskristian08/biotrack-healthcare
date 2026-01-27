import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/core/constants/widgets/primary_button.dart';
import 'package:biotrack_healthcare/core/constants/app_colors.dart';
import '../../widgets/onboarding_slide.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final controller = PageController();
  int index = 0;

  void next() {
    if (index < 3) {
      controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pushNamed(context, '/auth');
    }
  }

  Widget logo(double size) => Image.asset(
        'assets/images/logo.png',
        height: size,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: PageView(
        controller: controller,
           physics: index == 0
      ? const PageScrollPhysics()
      : const NeverScrollableScrollPhysics(),

        onPageChanged: (i) => setState(() => index = i),
        children: [
          OnboardingSlide(
            content: logo(200),
            bottom: const SizedBox(),
          ),

          OnboardingSlide(
  content: Column(
    children: [
      const Spacer(flex: 2),

      // LOGO
      Image.asset(
        'assets/images/logo.png',
        height: 140, // bigger, matches reference
      ),

      const SizedBox(height: 32),

      // TEXT BLOCK
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: const [
            Text(
              'Welcome to BioTrack',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppColors.darkText,
              ),
            ),

            SizedBox(height: 12),

            Text(
              'BioTrack brings all your health data, insights, and records '
              'together in one secure place.\n\n'
              'Get important health alerts, understand your vital data through AI insights, and learn essential health information.',
         textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                height: 1.5,
                color: AppColors.bodyText,
              ),
            ),

            SizedBox(height: 12),

            Text(
              'Get important health alerts, understand your vital data '
              'through AI insights, and learn essential health information.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                height: 1.5,
                color: AppColors.bodyText,
              ),
            ),
          ],
        ),
      ),

      const Spacer(flex: 3),
    ],
  ),

  // BUTTON AREA (anchored, but NOT glued)
  bottom: Padding(
    padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
    child: PrimaryButton(
      text: 'Continue',
      onTap: next,
    ),
  ),
),




OnboardingSlide(
  content: Padding(
    padding: const EdgeInsets.symmetric(horizontal: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 120),

        // ✅ Centered logo
        Center(
          child: Image.asset(
            'assets/images/logo.png',
            height: 120,
          ),
        ),

        const SizedBox(height: 32),

        const Text(
          'Your Health data is Private\nand Secure',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: AppColors.darkText,
          ),
        ),

        const SizedBox(height: 16),

        const Text(
          'BioTrack encrypts your vital data on your device when locked, ensuring it stays private and protected at all times.\n\n'
          'Your health records are never sold or misused. BioTrack uses blockchain verification to ensure data integrity and trust.\n\n'
          'You decide when and how your data is shared. With BioTrack, you can manage or disable data sharing anytime.',
          style: TextStyle(
            fontSize: 15,
            height: 1.6,
            color: AppColors.bodyText,
          ),
        ),

        const SizedBox(height: 16),

        const Text(
          'Learn more...',
          style: TextStyle(
            color: AppColors.primaryBlue,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    ),
  ),
  bottom: PrimaryButton(
    text: 'Continue',
    onTap: next,
  ),
),



OnboardingSlide(
  content: Stack(
    children: [
      // CENTERED, LARGE LOGO
      Center(
        child: Image.asset(
          'assets/images/logo.png',
          height: 160, // ⬅️ bigger, matches reference
        ),
      ),

      // BOTTOM-GLUED CARD
      Align(
        alignment: Alignment.bottomCenter,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          decoration: BoxDecoration(
            color: AppColors.lightGreen,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(24),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Stay Healthy with\nBioTrack Notifications',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.darkText,
                ),
              ),

              const SizedBox(height: 12),

              const Text(
                'Notifications help you stay on top of your vitals, '
                'receive important health alerts, and get timely '
                'AI-powered insights.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: AppColors.bodyText,
                ),
              ),

              const SizedBox(height: 20),

              PrimaryButton(
                text: 'Continue',
                onTap: next,
              ),
            ],
          ),
        ),
      ),
    ],
  ),
  bottom: const SizedBox(),
),





        ],
      ),
    );
  }
}
