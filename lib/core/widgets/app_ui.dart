import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radii.dart';
import '../theme/app_spacing.dart';
import '../theme/app_theme.dart';

enum AppTone { neutral, accent, success, warning, danger, info }

Color appToneForeground(AppTone tone) {
  switch (tone) {
    case AppTone.accent:
      return AppColors.primaryGreenDark;
    case AppTone.success:
      return AppColors.success;
    case AppTone.warning:
      return AppColors.warning;
    case AppTone.danger:
      return AppColors.danger;
    case AppTone.info:
      return AppColors.info;
    case AppTone.neutral:
      return AppColors.bodyText;
  }
}

Color appToneBackground(AppTone tone) {
  switch (tone) {
    case AppTone.accent:
      return AppColors.primaryGreenLight;
    case AppTone.success:
      return AppColors.success.withValues(alpha: 0.12);
    case AppTone.warning:
      return AppColors.warning.withValues(alpha: 0.12);
    case AppTone.danger:
      return AppColors.danger.withValues(alpha: 0.12);
    case AppTone.info:
      return AppColors.info.withValues(alpha: 0.12);
    case AppTone.neutral:
      return AppColors.surfaceMuted;
  }
}

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = AppSpacing.cardPadding,
    this.color = AppColors.softSurface,
    this.borderColor = AppColors.mutedBorder,
    this.radius = AppRadii.lg,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
        boxShadow: AppTheme.softShadow,
      ),
      padding: padding,
      child: child,
    );
  }
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
  });

  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: theme.titleMedium),
              if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(subtitle!, style: theme.bodySmall),
              ],
            ],
          ),
        ),
        if (action != null) ...[const SizedBox(width: AppSpacing.sm), action!],
      ],
    );
  }
}

class AppPageHeader extends StatelessWidget {
  const AppPageHeader({
    super.key,
    required this.title,
    this.eyebrow,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? eyebrow;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null && eyebrow!.trim().isNotEmpty) ...[
                Text(
                  eyebrow!,
                  style: theme.labelMedium?.copyWith(
                    color: AppColors.primaryGreenDark,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
              ],
              Text(title, style: theme.headlineLarge),
              if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(subtitle!, style: theme.bodyMedium),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: AppSpacing.md),
          trailing!,
        ],
      ],
    );
  }
}

class AppStatusBadge extends StatelessWidget {
  const AppStatusBadge({
    super.key,
    required this.label,
    this.tone = AppTone.neutral,
    this.icon,
  });

  final String label;
  final AppTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final foreground = appToneForeground(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: appToneBackground(tone),
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: foreground),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: foreground),
          ),
        ],
      ),
    );
  }
}

class AppMetricCard extends StatelessWidget {
  const AppMetricCard({
    super.key,
    required this.label,
    required this.value,
    this.helper,
    this.icon,
    this.tone = AppTone.neutral,
    this.alignment = CrossAxisAlignment.start,
  });

  final String label;
  final String value;
  final String? helper;
  final IconData? icon;
  final AppTone tone;
  final CrossAxisAlignment alignment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final foreground = appToneForeground(tone);
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: alignment,
        children: [
          if (icon != null)
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: appToneBackground(tone),
                borderRadius: BorderRadius.circular(AppRadii.md),
              ),
              child: Icon(icon, size: 18, color: foreground),
            ),
          if (icon != null) const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: theme.titleLarge?.copyWith(color: AppColors.darkText),
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(label, style: theme.bodySmall),
          if (helper != null && helper!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              helper!,
              style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
            ),
          ],
        ],
      ),
    );
  }
}

class AppActionTile extends StatelessWidget {
  const AppActionTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget? trailing;

  Widget _buildLeadingIcon() {
    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: AppColors.primaryGreenLight,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Icon(icon, color: AppColors.primaryGreenDark),
    );
  }

  Widget _buildTrailing() {
    return trailing ??
        const Icon(Icons.chevron_right_rounded, color: AppColors.secondaryText);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: AppCard(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final useStackedLayout = constraints.maxWidth < 210;

              if (useStackedLayout) {
                return ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 176),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _buildLeadingIcon(),
                          const Spacer(),
                          _buildTrailing(),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.titleSmall,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        subtitle,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: theme.bodySmall,
                      ),
                    ],
                  ),
                );
              }

              return Row(
                children: [
                  _buildLeadingIcon(),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.titleSmall,
                        ),
                        const SizedBox(height: AppSpacing.xxs),
                        Text(
                          subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _buildTrailing(),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class AppInfoBanner extends StatelessWidget {
  const AppInfoBanner({
    super.key,
    required this.message,
    this.title,
    this.tone = AppTone.info,
    this.action,
  });

  final String message;
  final String? title;
  final AppTone tone;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final foreground = appToneForeground(tone);
    final theme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: appToneBackground(tone),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: foreground.withValues(alpha: 0.18)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 18, color: foreground),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null && title!.trim().isNotEmpty) ...[
                  Text(
                    title!,
                    style: theme.labelLarge?.copyWith(color: foreground),
                  ),
                  const SizedBox(height: AppSpacing.xxs),
                ],
                Text(
                  message,
                  style: theme.bodySmall?.copyWith(color: foreground),
                ),
              ],
            ),
          ),
          if (action != null) ...[
            const SizedBox(width: AppSpacing.sm),
            action!,
          ],
        ],
      ),
    );
  }
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.xl),
      color: AppColors.surfaceMuted,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primaryGreenLight,
              borderRadius: BorderRadius.circular(AppRadii.xl),
            ),
            child: Icon(icon, color: AppColors.primaryGreenDark, size: 26),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(title, style: theme.titleMedium, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.xs),
          Text(subtitle, style: theme.bodySmall, textAlign: TextAlign.center),
          if (action != null) ...[
            const SizedBox(height: AppSpacing.md),
            action!,
          ],
        ],
      ),
    );
  }
}

class AppSkeletonCard extends StatelessWidget {
  const AppSkeletonCard({
    super.key,
    required this.child,
    this.padding = AppSpacing.cardPadding,
    this.height,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: AppColors.softSurface,
      borderColor: AppColors.surfaceTint,
      padding: padding,
      child: SizedBox(height: height, child: child),
    );
  }
}

class AppSkeletonBlock extends StatelessWidget {
  const AppSkeletonBlock({
    super.key,
    this.width,
    required this.height,
    this.radius = AppRadii.md,
    this.color,
  });

  final double? width;
  final double height;
  final double radius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color ?? AppColors.surfaceTint,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class AppSkeletonParagraph extends StatelessWidget {
  const AppSkeletonParagraph({
    super.key,
    this.lines = 3,
    this.lineHeight = 12,
    this.spacing = AppSpacing.xs,
    this.lastLineFactor = 0.58,
  });

  final int lines;
  final double lineHeight;
  final double spacing;
  final double lastLineFactor;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : 240.0;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: List.generate(lines, (index) {
            final isLast = index == lines - 1;
            return Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : spacing),
              child: AppSkeletonBlock(
                width: isLast ? maxWidth * lastLineFactor : maxWidth,
                height: lineHeight,
                radius: AppRadii.pill,
              ),
            );
          }),
        );
      },
    );
  }
}
