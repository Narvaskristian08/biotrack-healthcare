import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'auth_theme_extensions.dart';
import 'app_radii.dart';

class AppTheme {
  static ThemeData get light {
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primaryGreen,
      onPrimary: Colors.white,
      secondary: AppColors.info,
      onSecondary: Colors.white,
      error: AppColors.danger,
      onError: Colors.white,
      surface: AppColors.softSurface,
      onSurface: AppColors.darkText,
    );

    final base = ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.softBackground,
      splashFactory: InkRipple.splashFactory,
      dividerColor: AppColors.mutedBorder,
    );

    final textTheme = _buildTextTheme(base.textTheme);

    return base.copyWith(
      extensions: const <ThemeExtension<dynamic>>[AuthThemeExtension.light],
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.darkText,
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge,
        iconTheme: const IconThemeData(color: AppColors.darkText, size: 22),
      ),
      cardTheme: CardThemeData(
        color: AppColors.softSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          side: const BorderSide(color: AppColors.mutedBorder),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryGreen,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.disabled,
          disabledForegroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size.fromHeight(54),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.darkText,
          minimumSize: const Size.fromHeight(54),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          side: const BorderSide(color: AppColors.mutedBorder),
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primaryGreenDark,
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.softSurface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: AppColors.secondaryText,
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(color: AppColors.bodyText),
        floatingLabelStyle: textTheme.bodyMedium?.copyWith(
          color: AppColors.primaryGreenDark,
          fontWeight: FontWeight.w700,
        ),
        helperStyle: textTheme.bodySmall,
        errorStyle: textTheme.bodySmall?.copyWith(color: AppColors.danger),
        prefixIconColor: AppColors.secondaryText,
        suffixIconColor: AppColors.secondaryText,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.mutedBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.mutedBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(
            color: AppColors.primaryGreen,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.4),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.darkText,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.softSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.xl),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceMuted,
        disabledColor: AppColors.surfaceTint,
        selectedColor: AppColors.primaryGreenLight,
        secondarySelectedColor: AppColors.primaryGreenLight,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        labelStyle: textTheme.labelSmall?.copyWith(
          color: AppColors.darkText,
          fontWeight: FontWeight.w700,
        ),
        side: const BorderSide(color: AppColors.mutedBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.pill),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.mutedBorder,
        space: 1,
        thickness: 1,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.softSurface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.primaryGreenLight,
        height: 72,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return textTheme.labelSmall!.copyWith(
            color: selected
                ? AppColors.primaryGreenDark
                : AppColors.secondaryText,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected
                ? AppColors.primaryGreenDark
                : AppColors.secondaryText,
            size: 22,
          );
        }),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primaryGreen,
        linearTrackColor: AppColors.surfaceTint,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return Colors.white;
          }
          return AppColors.softSurface;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primaryGreen;
          }
          return AppColors.outlineStrong;
        }),
      ),
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        side: const BorderSide(color: AppColors.outlineStrong),
        visualDensity: VisualDensity.compact,
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.disabled)) {
            return AppColors.disabled;
          }
          if (states.contains(WidgetState.selected)) {
            return AppColors.primaryGreen;
          }
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all(Colors.white),
      ),
    );
  }

  static TextTheme _buildTextTheme(TextTheme base) {
    TextStyle style({
      required double size,
      required FontWeight weight,
      required double height,
      Color color = AppColors.darkText,
      double? letterSpacing,
    }) {
      return TextStyle(
        fontFamily: 'Inter',
        fontSize: size,
        fontWeight: weight,
        height: height,
        color: color,
        letterSpacing: letterSpacing,
      );
    }

    return base.copyWith(
      displaySmall: style(size: 34, weight: FontWeight.w700, height: 1.12),
      headlineLarge: style(size: 30, weight: FontWeight.w700, height: 1.12),
      headlineMedium: style(size: 24, weight: FontWeight.w700, height: 1.16),
      titleLarge: style(size: 20, weight: FontWeight.w700, height: 1.2),
      titleMedium: style(size: 16, weight: FontWeight.w700, height: 1.25),
      titleSmall: style(size: 14, weight: FontWeight.w700, height: 1.25),
      bodyLarge: style(
        size: 15,
        weight: FontWeight.w500,
        height: 1.45,
        color: AppColors.bodyText,
      ),
      bodyMedium: style(
        size: 14,
        weight: FontWeight.w500,
        height: 1.45,
        color: AppColors.bodyText,
      ),
      bodySmall: style(
        size: 12,
        weight: FontWeight.w500,
        height: 1.4,
        color: AppColors.secondaryText,
      ),
      labelLarge: style(
        size: 14,
        weight: FontWeight.w700,
        height: 1.2,
        color: AppColors.darkText,
      ),
      labelMedium: style(
        size: 12,
        weight: FontWeight.w700,
        height: 1.2,
        color: AppColors.darkText,
        letterSpacing: 0.2,
      ),
      labelSmall: style(
        size: 11,
        weight: FontWeight.w700,
        height: 1.15,
        color: AppColors.darkText,
        letterSpacing: 0.25,
      ),
    );
  }

  static List<BoxShadow> get softShadow => <BoxShadow>[
    BoxShadow(
      color: AppColors.shadow.withValues(alpha: 0.06),
      blurRadius: 24,
      offset: const Offset(0, 10),
    ),
    BoxShadow(
      color: AppColors.shadow.withValues(alpha: 0.02),
      blurRadius: 4,
      offset: const Offset(0, 2),
    ),
  ];
}
