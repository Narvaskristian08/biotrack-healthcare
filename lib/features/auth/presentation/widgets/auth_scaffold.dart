import 'package:flutter/material.dart';

import '../../../../core/theme/auth_theme_extensions.dart';
import '../../../../core/theme/app_spacing.dart';

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: <Widget>[
          const AuthBackground(),
          SafeArea(
            child: Padding(padding: padding, child: child),
          ),
        ],
      ),
    );
  }
}

class AuthBackground extends StatelessWidget {
  const AuthBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final authTheme = context.authTheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: <Color>[authTheme.pageTop, authTheme.pageBottom],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          Positioned(
            top: -84,
            right: -28,
            child: _GlowOrb(
              size: 220,
              color: authTheme.pageGlow.withValues(alpha: 0.88),
            ),
          ),
          Positioned(
            top: 184,
            left: -62,
            child: _GlowOrb(
              size: 150,
              color: authTheme.pageGlowSoft.withValues(alpha: 0.9),
            ),
          ),
          Positioned(
            bottom: -76,
            right: 18,
            child: _GlowOrb(
              size: 180,
              color: authTheme.pageGlow.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}

class AuthScrollView extends StatelessWidget {
  const AuthScrollView({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.fromLTRB(
      AppSpacing.lg,
      AppSpacing.md,
      AppSpacing.lg,
      AppSpacing.xxl,
    ),
    this.maxContentWidth = 560,
  });

  final List<Widget> children;
  final EdgeInsetsGeometry padding;
  final double maxContentWidth;

  @override
  Widget build(BuildContext context) {
    final resolvedPadding = padding.resolve(Directionality.of(context));
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: resolvedPadding.copyWith(
        bottom: resolvedPadding.bottom + bottomInset + AppSpacing.md,
      ),
      children: <Widget>[
        Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxContentWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ),
      ],
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, color: color),
      ),
    );
  }
}
