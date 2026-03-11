import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';
import '../../data/models/intro_model.dart';

class IntroSlide extends StatelessWidget {
  final IntroData data;

  const IntroSlide({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    // Detect small screens for padding adjustments
    final bool isSmallScreen = MediaQuery.of(context).size.height < 700;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min, // Reverted: Cards now shrink-wrap content
        children: [
          const SizedBox(height: 12),
          _buildTitleCard(isSmallScreen),
          const SizedBox(height: 16),
          _buildDetailsCard(isSmallScreen),
        ],
      ),
    );
  }

  Widget _buildTitleCard(bool isSmall) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
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
                    fontFamily: 'Inter',
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
                    fontFamily: 'Inter',
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: isSmall ? 20 : 24,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Icon(data.icon, color: Colors.white, size: isSmall ? 32 : 40),
        ],
      ),
    );
  }

  Widget _buildDetailsCard(bool isSmall) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: Colors.white.withValues(alpha: 0.95),
        border: Border.all(color: const Color(0xFFCEE5D9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Why it matters?',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.darkText,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            data.description,
            style: TextStyle(
              fontSize: isSmall ? 13 : 14.2,
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
        style: const TextStyle(
          fontFamily: 'Inter',
          color: Color(0xFF136A47),
          fontWeight: FontWeight.w600,
          fontSize: 11.4,
        ),
      ),
    );
  }
}