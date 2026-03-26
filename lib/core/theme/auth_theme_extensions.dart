import 'package:flutter/material.dart';

import 'app_colors.dart';

@immutable
class AuthThemeExtension extends ThemeExtension<AuthThemeExtension> {
  const AuthThemeExtension({
    required this.pageTop,
    required this.pageBottom,
    required this.pageGlow,
    required this.pageGlowSoft,
    required this.surface,
    required this.surfaceMuted,
    required this.surfaceAccent,
    required this.outline,
    required this.outlineStrong,
    required this.chipFill,
    required this.chipBorder,
    required this.chipText,
    required this.heroIconFill,
    required this.heroIconForeground,
    required this.successFill,
    required this.warningFill,
    required this.dangerFill,
    required this.cardShadow,
  });

  static const AuthThemeExtension light = AuthThemeExtension(
    pageTop: Color(0xFFF8FBF8),
    pageBottom: Color(0xFFF1F6F2),
    pageGlow: Color(0xFFDCF0E4),
    pageGlowSoft: Color(0xFFEAF5EF),
    surface: Colors.white,
    surfaceMuted: Color(0xFFF7FAF8),
    surfaceAccent: Color(0xFFF0F7F3),
    outline: Color(0xFFD7E3DB),
    outlineStrong: Color(0xFFBDCCC3),
    chipFill: Color(0xFFF2F7F4),
    chipBorder: Color(0xFFD4E4DB),
    chipText: AppColors.primaryGreenDark,
    heroIconFill: Color(0xFFE8F4EE),
    heroIconForeground: AppColors.primaryGreenDark,
    successFill: Color(0xFFEAF7F0),
    warningFill: Color(0xFFFFF5E8),
    dangerFill: Color(0xFFFDEEEE),
    cardShadow: <BoxShadow>[
      BoxShadow(
        color: Color(0x14111915),
        blurRadius: 28,
        offset: Offset(0, 12),
      ),
      BoxShadow(color: Color(0x0A111915), blurRadius: 6, offset: Offset(0, 2)),
    ],
  );

  final Color pageTop;
  final Color pageBottom;
  final Color pageGlow;
  final Color pageGlowSoft;
  final Color surface;
  final Color surfaceMuted;
  final Color surfaceAccent;
  final Color outline;
  final Color outlineStrong;
  final Color chipFill;
  final Color chipBorder;
  final Color chipText;
  final Color heroIconFill;
  final Color heroIconForeground;
  final Color successFill;
  final Color warningFill;
  final Color dangerFill;
  final List<BoxShadow> cardShadow;

  @override
  AuthThemeExtension copyWith({
    Color? pageTop,
    Color? pageBottom,
    Color? pageGlow,
    Color? pageGlowSoft,
    Color? surface,
    Color? surfaceMuted,
    Color? surfaceAccent,
    Color? outline,
    Color? outlineStrong,
    Color? chipFill,
    Color? chipBorder,
    Color? chipText,
    Color? heroIconFill,
    Color? heroIconForeground,
    Color? successFill,
    Color? warningFill,
    Color? dangerFill,
    List<BoxShadow>? cardShadow,
  }) {
    return AuthThemeExtension(
      pageTop: pageTop ?? this.pageTop,
      pageBottom: pageBottom ?? this.pageBottom,
      pageGlow: pageGlow ?? this.pageGlow,
      pageGlowSoft: pageGlowSoft ?? this.pageGlowSoft,
      surface: surface ?? this.surface,
      surfaceMuted: surfaceMuted ?? this.surfaceMuted,
      surfaceAccent: surfaceAccent ?? this.surfaceAccent,
      outline: outline ?? this.outline,
      outlineStrong: outlineStrong ?? this.outlineStrong,
      chipFill: chipFill ?? this.chipFill,
      chipBorder: chipBorder ?? this.chipBorder,
      chipText: chipText ?? this.chipText,
      heroIconFill: heroIconFill ?? this.heroIconFill,
      heroIconForeground: heroIconForeground ?? this.heroIconForeground,
      successFill: successFill ?? this.successFill,
      warningFill: warningFill ?? this.warningFill,
      dangerFill: dangerFill ?? this.dangerFill,
      cardShadow: cardShadow ?? this.cardShadow,
    );
  }

  @override
  AuthThemeExtension lerp(ThemeExtension<AuthThemeExtension>? other, double t) {
    if (other is! AuthThemeExtension) {
      return this;
    }

    return AuthThemeExtension(
      pageTop: Color.lerp(pageTop, other.pageTop, t) ?? pageTop,
      pageBottom: Color.lerp(pageBottom, other.pageBottom, t) ?? pageBottom,
      pageGlow: Color.lerp(pageGlow, other.pageGlow, t) ?? pageGlow,
      pageGlowSoft:
          Color.lerp(pageGlowSoft, other.pageGlowSoft, t) ?? pageGlowSoft,
      surface: Color.lerp(surface, other.surface, t) ?? surface,
      surfaceMuted:
          Color.lerp(surfaceMuted, other.surfaceMuted, t) ?? surfaceMuted,
      surfaceAccent:
          Color.lerp(surfaceAccent, other.surfaceAccent, t) ?? surfaceAccent,
      outline: Color.lerp(outline, other.outline, t) ?? outline,
      outlineStrong:
          Color.lerp(outlineStrong, other.outlineStrong, t) ?? outlineStrong,
      chipFill: Color.lerp(chipFill, other.chipFill, t) ?? chipFill,
      chipBorder: Color.lerp(chipBorder, other.chipBorder, t) ?? chipBorder,
      chipText: Color.lerp(chipText, other.chipText, t) ?? chipText,
      heroIconFill:
          Color.lerp(heroIconFill, other.heroIconFill, t) ?? heroIconFill,
      heroIconForeground:
          Color.lerp(heroIconForeground, other.heroIconForeground, t) ??
          heroIconForeground,
      successFill: Color.lerp(successFill, other.successFill, t) ?? successFill,
      warningFill: Color.lerp(warningFill, other.warningFill, t) ?? warningFill,
      dangerFill: Color.lerp(dangerFill, other.dangerFill, t) ?? dangerFill,
      cardShadow:
          BoxShadow.lerpList(cardShadow, other.cardShadow, t) ?? cardShadow,
    );
  }
}

extension AuthThemeContextX on BuildContext {
  AuthThemeExtension get authTheme =>
      Theme.of(this).extension<AuthThemeExtension>() ??
      AuthThemeExtension.light;
}
