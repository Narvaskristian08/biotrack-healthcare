import 'package:flutter/material.dart';

class IntroData {
  final String kicker;
  final String title;
  final String description;
  final IconData icon;
  final List<String> pills;
  final String visualTitle;
  final List<String> visualPoints;

  const IntroData({
    required this.kicker,
    required this.title,
    required this.description,
    required this.icon,
    required this.pills,
    required this.visualTitle,
    required this.visualPoints,
  });
}
