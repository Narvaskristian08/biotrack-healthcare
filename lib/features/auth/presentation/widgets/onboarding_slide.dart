import 'package:flutter/material.dart';

import '../../../../core/theme/auth_theme_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../data/models/intro_model.dart';
import 'auth_card.dart';
import 'trust_chip.dart';

class OnboardingSlide extends StatelessWidget {
  const OnboardingSlide({super.key, required this.data});

  final IntroData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final authTheme = context.authTheme;

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final bool isCompactHeight = constraints.maxHeight < 700;
        final double cardIconSize = isCompactHeight ? 46 : 52;
        final double heroGap = isCompactHeight ? AppSpacing.xl : AppSpacing.xxl;
        final double sectionGap = isCompactHeight
            ? AppSpacing.md
            : AppSpacing.lg;
        final EdgeInsetsGeometry contentPadding = EdgeInsets.fromLTRB(
          AppSpacing.lg,
          isCompactHeight ? AppSpacing.sm : AppSpacing.md,
          AppSpacing.lg,
          isCompactHeight ? AppSpacing.lg : AppSpacing.xxl,
        );

        return SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          padding: contentPadding,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                AuthCard(
                  color: authTheme.surface.withValues(alpha: 0.97),
                  padding: EdgeInsets.all(
                    isCompactHeight ? AppSpacing.md : AppSpacing.lg,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Align(
                        alignment: Alignment.topRight,
                        child: Container(
                          width: cardIconSize,
                          height: cardIconSize,
                          decoration: BoxDecoration(
                            color: authTheme.heroIconFill,
                            borderRadius: BorderRadius.circular(AppRadii.lg),
                          ),
                          child: Icon(
                            data.icon,
                            color: authTheme.heroIconForeground,
                            size: isCompactHeight ? 24 : 26,
                          ),
                        ),
                      ),
                      SizedBox(height: sectionGap),
                      Text(
                        data.visualTitle,
                        style: theme.titleMedium?.copyWith(
                          color: AppColors.darkText,
                        ),
                      ),
                      SizedBox(
                        height: isCompactHeight ? AppSpacing.sm : AppSpacing.md,
                      ),
                      ...data.visualPoints.map(
                        (String item) => Padding(
                          padding: EdgeInsets.only(
                            bottom: isCompactHeight
                                ? AppSpacing.xs
                                : AppSpacing.sm,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: authTheme.surfaceAccent,
                                  borderRadius: BorderRadius.circular(
                                    AppRadii.md,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.check_rounded,
                                  size: 16,
                                  color: AppColors.primaryGreenDark,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(
                                    item,
                                    style: theme.bodyMedium?.copyWith(
                                      color: AppColors.bodyText,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: heroGap),
                Text(
                  data.kicker.toUpperCase(),
                  style: theme.labelMedium?.copyWith(
                    color: AppColors.primaryGreenDark,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(data.title, style: theme.headlineMedium),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  data.description,
                  style: theme.bodyLarge?.copyWith(color: AppColors.bodyText),
                ),
                SizedBox(height: sectionGap),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: data.pills
                      .map(
                        (String chip) =>
                            TrustChip(label: chip, tone: TrustChipTone.accent),
                      )
                      .toList(growable: false),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
