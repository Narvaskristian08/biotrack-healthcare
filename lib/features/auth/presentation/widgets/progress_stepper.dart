import 'package:flutter/material.dart';

import '../../../../core/theme/auth_theme_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import 'auth_card.dart';

class ProgressStepData {
  const ProgressStepData({required this.label});

  final String label;
}

class ProgressStepper extends StatelessWidget {
  const ProgressStepper({
    super.key,
    required this.currentStep,
    required this.steps,
  });

  final int currentStep;
  final List<ProgressStepData> steps;

  @override
  Widget build(BuildContext context) {
    final authTheme = context.authTheme;
    final theme = Theme.of(context).textTheme;
    final progress = steps.isEmpty ? 0.0 : currentStep / steps.length;

    return AuthCard(
      color: authTheme.surface.withValues(alpha: 0.96),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(
                'Step $currentStep of ${steps.length}',
                style: theme.labelLarge?.copyWith(
                  color: AppColors.primaryGreenDark,
                ),
              ),
              const Spacer(),
              Text(
                steps[currentStep - 1].label,
                style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadii.pill),
            child: LinearProgressIndicator(
              minHeight: 8,
              value: progress,
              backgroundColor: authTheme.surfaceAccent,
              color: AppColors.primaryGreen,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: List<Widget>.generate(steps.length, (int index) {
              final stepNumber = index + 1;
              final isActive = stepNumber == currentStep;
              final isComplete = stepNumber < currentStep;

              final background = isActive
                  ? authTheme.surfaceAccent
                  : authTheme.surfaceMuted;
              final border = isActive || isComplete
                  ? authTheme.chipBorder
                  : authTheme.outline;
              final badgeColor = isActive || isComplete
                  ? AppColors.primaryGreen
                  : authTheme.outlineStrong;

              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    right: index == steps.length - 1 ? 0 : AppSpacing.xs,
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.sm,
                    ),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      border: Border.all(color: border),
                    ),
                    child: Row(
                      children: <Widget>[
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: badgeColor,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '$stepNumber',
                              style: theme.labelSmall?.copyWith(
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(
                          child: Text(
                            steps[index].label,
                            overflow: TextOverflow.ellipsis,
                            style: theme.labelSmall?.copyWith(
                              color: isActive || isComplete
                                  ? AppColors.primaryGreenDark
                                  : AppColors.secondaryText,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
