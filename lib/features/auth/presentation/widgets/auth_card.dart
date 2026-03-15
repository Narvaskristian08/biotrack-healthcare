import 'package:flutter/material.dart';

import '../../../../core/theme/auth_theme_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';

class AuthCard extends StatelessWidget {
  const AuthCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.color,
    this.borderColor,
    this.radius = AppRadii.xl,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Color? borderColor;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final authTheme = context.authTheme;
    return Container(
      decoration: BoxDecoration(
        color: color ?? authTheme.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor ?? authTheme.outline),
        boxShadow: authTheme.cardShadow,
      ),
      padding: padding,
      child: child,
    );
  }
}

class AuthSectionCard extends StatelessWidget {
  const AuthSectionCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.icon,
    this.action,
    this.tint,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final IconData? icon;
  final Widget? action;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final authTheme = context.authTheme;

    return AuthCard(
      color: tint ?? authTheme.surface,
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (icon != null) ...<Widget>[
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: authTheme.heroIconFill,
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: authTheme.heroIconForeground,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(title, style: theme.titleMedium),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(
                      subtitle,
                      style: theme.bodySmall?.copyWith(
                        color: AppColors.bodyText,
                      ),
                    ),
                  ],
                ),
              ),
              if (action != null) ...<Widget>[
                const SizedBox(width: AppSpacing.sm),
                action!,
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          child,
        ],
      ),
    );
  }
}
