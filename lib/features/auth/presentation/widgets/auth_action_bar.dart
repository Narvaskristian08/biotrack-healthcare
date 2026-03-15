import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';

enum AuthActionBarLayout { row, column }

class AuthActionBar extends StatelessWidget {
  const AuthActionBar({
    super.key,
    required this.primaryLabel,
    required this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
    this.primaryIcon,
    this.secondaryIcon,
    this.layout = AuthActionBarLayout.column,
  });

  final String primaryLabel;
  final VoidCallback? onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final IconData? primaryIcon;
  final IconData? secondaryIcon;
  final AuthActionBarLayout layout;

  @override
  Widget build(BuildContext context) {
    final primaryButton = ElevatedButton.icon(
      onPressed: onPrimary,
      icon: Icon(primaryIcon ?? Icons.arrow_forward_rounded, size: 18),
      label: Text(primaryLabel),
    );

    final secondaryButton = secondaryLabel == null
        ? null
        : OutlinedButton.icon(
            onPressed: onSecondary,
            icon: Icon(secondaryIcon ?? Icons.arrow_back_rounded, size: 18),
            label: Text(secondaryLabel!),
          );

    if (secondaryButton == null) {
      return SizedBox(width: double.infinity, child: primaryButton);
    }

    if (layout == AuthActionBarLayout.row) {
      return Row(
        children: <Widget>[
          Expanded(child: secondaryButton),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: primaryButton),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        primaryButton,
        const SizedBox(height: AppSpacing.sm),
        secondaryButton,
      ],
    );
  }
}
