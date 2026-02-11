import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../../common/widgets/primary_button.dart';
import '../../../../../core/config/app_config.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/services/auth_api_service.dart';
import '../../../data/services/auth_session_store.dart';
import '../../widgets/auth_text_field.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _api = AuthApiService();

  bool _isLoading = false;
  String _errorMessage = '';

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final login = await _api.loginPatient(
        email: _emailController.text,
        password: _passwordController.text,
      );
      await AuthSessionStore.save(login);

      if (!mounted) {
        return;
      }
      context.go('/home');
    } on AuthApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = 'Login failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF2F7EE),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE4F4D8), Color(0xFFCFE8BA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(
                  children: [
                    Image.asset('assets/images/logo.png', height: 92),
                    const SizedBox(height: 14),
                    const Text(
                      'Welcome back',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Use your patient account to continue.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.bodyText, height: 1.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              AuthTextField(
                controller: _emailController,
                label: 'Email',
                hintText: 'name@example.com',
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  final v = (value ?? '').trim();
                  if (v.isEmpty) {
                    return 'Email is required';
                  }
                  if (!v.contains('@')) {
                    return 'Enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              AuthTextField(
                controller: _passwordController,
                label: 'Password',
                hintText: 'Enter your password',
                obscureText: true,
                validator: (value) {
                  if ((value ?? '').isEmpty) {
                    return 'Password is required';
                  }
                  return null;
                },
              ),
              if (_errorMessage.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  _errorMessage,
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              PrimaryButton(
                text: _isLoading ? 'Signing in...' : 'Log In',
                onTap: _isLoading ? () {} : _submit,
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: _isLoading ? null : () => context.go('/signup'),
                child: const Text(
                  'Create patient account',
                  style: TextStyle(
                    color: AppColors.primaryBlue,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFE9EFE3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'API: ${AppConfig.apiBaseUrl}',
                  style: const TextStyle(fontSize: 11, color: Colors.black54),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
