import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:biotrack_healthcare/core/theme/auth_theme_extensions.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';
import 'package:biotrack_healthcare/core/theme/app_radii.dart';
import 'package:biotrack_healthcare/core/theme/app_spacing.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_action_bar.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_card.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_header.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/auth_scaffold.dart';
import 'package:biotrack_healthcare/features/auth/presentation/widgets/trust_chip.dart';

class AuthChoicePage extends StatelessWidget {
  const AuthChoicePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final authTheme = context.authTheme;

    return AuthScaffold(
      child: AuthScrollView(
        children: <Widget>[
          const SizedBox(height: AppSpacing.sm),
          const AuthBrandMark(subtitle: 'Trusted digital healthcare'),
          const SizedBox(height: AppSpacing.xxl),
          AuthHeroHeader(
            eyebrow: 'Welcome',
            title: 'Secure patient access from your phone',
            subtitle:
                'Create a patient account or sign in to monitor daily vitals, review AI guidance, and keep records protected.',
            visual: Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                color: authTheme.heroIconFill,
                borderRadius: BorderRadius.circular(AppRadii.xl),
              ),
              child: const Icon(
                Icons.health_and_safety_outlined,
                size: 34,
                color: AppColors.primaryGreenDark,
              ),
            ),
            footer: Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: const <Widget>[
                TrustChip(
                  label: 'Secure Patient Access',
                  icon: Icons.lock_outline_rounded,
                  tone: TrustChipTone.accent,
                ),
                TrustChip(
                  label: 'Connected to your health center',
                  icon: Icons.local_hospital_outlined,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AuthCard(
            color: authTheme.surface.withValues(alpha: 0.96),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('What BioTrack helps you do', style: theme.titleMedium),
                const SizedBox(height: AppSpacing.lg),
                const _ChoiceFeature(
                  icon: Icons.monitor_heart_outlined,
                  title: 'Monitor daily vitals',
                  subtitle: 'Use your smartphone for guided health check-ins.',
                ),
                const SizedBox(height: AppSpacing.md),
                const _ChoiceFeature(
                  icon: Icons.psychology_alt_outlined,
                  title: 'Understand your readings',
                  subtitle: 'Receive clear AI summaries in simple language.',
                ),
                const SizedBox(height: AppSpacing.md),
                const _ChoiceFeature(
                  icon: Icons.verified_user_outlined,
                  title: 'Protect health records',
                  subtitle:
                      'Keep your patient data private and integrity-verified.',
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AuthCard(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('Get started', style: theme.titleLarge),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Choose the option that matches your patient account status.',
                  style: theme.bodyMedium?.copyWith(color: AppColors.bodyText),
                ),
                const SizedBox(height: AppSpacing.xl),
                AuthActionBar(
                  primaryLabel: 'Create Patient Account',
                  onPrimary: () => context.push('/signup'),
                  primaryIcon: Icons.person_add_alt_1_rounded,
                  secondaryLabel: 'Log In',
                  onSecondary: () => context.push('/login'),
                  secondaryIcon: Icons.login_rounded,
                ),
                const SizedBox(height: AppSpacing.lg),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: authTheme.surfaceAccent,
                    borderRadius: BorderRadius.circular(AppRadii.md),
                    border: Border.all(color: authTheme.chipBorder),
                  ),
                  child: Row(
                    children: <Widget>[
                      const Icon(
                        Icons.verified_user_outlined,
                        size: 18,
                        color: AppColors.primaryGreenDark,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          'Secure patient access linked to your health center.',
                          style: theme.bodySmall?.copyWith(
                            color: AppColors.primaryGreenDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChoiceFeature extends StatelessWidget {
  const _ChoiceFeature({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final authTheme = context.authTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: authTheme.surfaceAccent,
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          child: Icon(icon, color: AppColors.primaryGreenDark, size: 20),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: theme.titleSmall),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                subtitle,
                style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
