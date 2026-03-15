import 'package:flutter/material.dart';

import '../../../../core/theme/auth_theme_extensions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';

enum TrustChipTone { neutral, accent, success }

class TrustChip extends StatelessWidget {
  const TrustChip({
    super.key,
    required this.label,
    this.icon,
    this.tone = TrustChipTone.neutral,
  });

  final String label;
  final IconData? icon;
  final TrustChipTone tone;

  @override
  Widget build(BuildContext context) {
    final authTheme = context.authTheme;
    final theme = Theme.of(context).textTheme;

    final Color background;
    final Color border;
    final Color foreground;

    switch (tone) {
      case TrustChipTone.accent:
        background = authTheme.surfaceAccent;
        border = authTheme.chipBorder;
        foreground = AppColors.primaryGreenDark;
      case TrustChipTone.success:
        background = AppColors.successSoft;
        border = AppColors.primaryGreenLight;
        foreground = AppColors.success;
      case TrustChipTone.neutral:
        background = authTheme.chipFill;
        border = authTheme.chipBorder;
        foreground = authTheme.chipText;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: 14, color: foreground),
            const SizedBox(width: AppSpacing.xs),
          ],
          Text(label, style: theme.labelSmall?.copyWith(color: foreground)),
        ],
      ),
    );
  }
}
