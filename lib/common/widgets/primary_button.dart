import 'package:flutter/material.dart';

class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback onTap;
  final bool outlined;

  const PrimaryButton({
    super.key,
    required this.text,
    required this.onTap,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      width: double.infinity,
      child: outlined
          ? OutlinedButton(onPressed: onTap, child: Text(text))
          : ElevatedButton(onPressed: onTap, child: Text(text)),
    );
  }
}
