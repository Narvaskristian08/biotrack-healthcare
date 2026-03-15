import 'package:flutter/material.dart';

import '../../../../core/theme/auth_theme_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import 'auth_card.dart';

class AuthBrandMark extends StatelessWidget {
  const AuthBrandMark({super.key, this.compact = false, this.subtitle});

  final bool compact;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final authTheme = context.authTheme;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xs : AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: authTheme.surface.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: authTheme.outline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: compact ? 30 : 38,
            height: compact ? 30 : 38,
            decoration: BoxDecoration(
              color: authTheme.heroIconFill,
              borderRadius: BorderRadius.circular(compact ? 12 : 14),
            ),
            child: Icon(
              Icons.favorite_rounded,
              size: compact ? 18 : 20,
              color: authTheme.heroIconForeground,
            ),
          ),
          SizedBox(width: compact ? AppSpacing.sm : AppSpacing.md),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                'BioTrack',
                style: (compact ? theme.titleSmall : theme.titleMedium)
                    ?.copyWith(color: AppColors.darkText),
              ),
              if (!compact && subtitle != null && subtitle!.trim().isNotEmpty)
                Text(
                  subtitle!,
                  style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class AuthTopBar extends StatelessWidget {
  const AuthTopBar({super.key, this.onBack, this.contextLabel, this.trailing});

  final VoidCallback? onBack;
  final String? contextLabel;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final authTheme = context.authTheme;
    final theme = Theme.of(context).textTheme;

    return Row(
      children: <Widget>[
        if (onBack != null)
          InkWell(
            onTap: onBack,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: authTheme.surface.withValues(alpha: 0.96),
                shape: BoxShape.circle,
                border: Border.all(color: authTheme.outline),
              ),
              child: const Icon(
                Icons.arrow_back_rounded,
                color: AppColors.darkText,
              ),
            ),
          )
        else
          const SizedBox.shrink(),
        if (contextLabel?.trim().isNotEmpty ?? false) ...<Widget>[
          if (onBack != null) const SizedBox(width: AppSpacing.md),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: authTheme.surface.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(AppRadii.pill),
              border: Border.all(color: authTheme.outline),
            ),
            child: Text(
              contextLabel!,
              style: theme.labelSmall?.copyWith(
                color: AppColors.primaryGreenDark,
              ),
            ),
          ),
        ],
        const Spacer(),
        if (trailing case final Widget widget) widget,
      ],
    );
  }
}

class AuthHeroHeader extends StatelessWidget {
  const AuthHeroHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    this.icon,
    this.visual,
    this.footer,
  });

  final String eyebrow;
  final String title;
  final String subtitle;
  final IconData? icon;
  final Widget? visual;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final authTheme = context.authTheme;

    return AuthCard(
      color: authTheme.surface.withValues(alpha: 0.96),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      eyebrow.toUpperCase(),
                      style: theme.labelMedium?.copyWith(
                        color: AppColors.primaryGreenDark,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(title, style: theme.headlineMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      subtitle,
                      style: theme.bodyMedium?.copyWith(
                        color: AppColors.bodyText,
                      ),
                    ),
                  ],
                ),
              ),
              if (visual != null) ...<Widget>[
                const SizedBox(width: AppSpacing.md),
                visual!,
              ] else if (icon != null) ...<Widget>[
                const SizedBox(width: AppSpacing.md),
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: authTheme.heroIconFill,
                    borderRadius: BorderRadius.circular(AppRadii.lg),
                  ),
                  child: Icon(
                    icon,
                    size: 28,
                    color: authTheme.heroIconForeground,
                  ),
                ),
              ],
            ],
          ),
          if (footer != null) ...<Widget>[
            const SizedBox(height: AppSpacing.md),
            footer!,
          ],
        ],
      ),
    );
  }
}
