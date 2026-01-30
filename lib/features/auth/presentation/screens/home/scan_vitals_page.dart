import 'package:flutter/material.dart';

class ScanVitalsPage extends StatefulWidget {
  const ScanVitalsPage({super.key});

  @override
  State<ScanVitalsPage> createState() => _ScanVitalsPageState();
}

class _ScanVitalsPageState extends State<ScanVitalsPage> {
  bool loading = true;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 3), () {
      setState(() => loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(),
        title: const Text('Scan Vitals'),
      ),
      body: Center(
        child: loading
            ? const Text('Measuring...')
            : const Text('Scan Complete'),
      ),
    );
  }
}
