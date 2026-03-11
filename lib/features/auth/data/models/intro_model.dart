import 'package:flutter/material.dart';

class IntroData {
  final String kicker;
  final String title;
  final String description;
  final IconData icon;
  final List<String> pills;

  const IntroData({
    required this.kicker,
    required this.title,
    required this.description,
    required this.icon,
    required this.pills,
  });
}