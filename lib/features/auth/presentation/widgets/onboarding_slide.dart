import 'package:flutter/material.dart';

class OnboardingSlide extends StatelessWidget {
  final Widget content;
  final Widget bottom;

  const OnboardingSlide({
    super.key,
    required this.content,
    required this.bottom,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Center(child: content),
          ),
          Positioned(left: 24, right: 24, bottom: 32, child: bottom),
        ],
      ),
    );
  }
}
