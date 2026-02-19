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
  final _api = AuthApiService();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _mfaCodeController = TextEditingController();

  bool _isLoading = false;
  bool _showPassword = false;
  String _errorMessage = '';
  String _mfaPatientId = '';
  String _mfaChallengeId = '';
  String _mfaMethod = 'email';
  String _mfaRecipientMasked = '';
  String _mfaDevPreviewCode = '';

  bool get _isMfaStep => _mfaPatientId.isNotEmpty && _mfaChallengeId.isNotEmpty;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _mfaCodeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_isMfaStep) {
      final code = _mfaCodeController.text.trim();
      if (!RegExp(r'^\d{6}$').hasMatch(code)) {
        setState(() {
          _errorMessage = 'Enter the 6-digit verification code.';
        });
        return;
      }
    } else {
      final form = _formKey.currentState;
      if (form == null || !form.validate()) {
        return;
      }
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final result = _isMfaStep
          ? await _api.verifyPatientLoginMfa(
              patientId: _mfaPatientId,
              challengeId: _mfaChallengeId,
              code: _mfaCodeController.text,
            )
          : await _api.loginPatient(
              email: _emailController.text,
              password: _passwordController.text,
            );
      await AuthSessionStore.save(result);

      if (!mounted) return;
      context.go('/home');
    } on AuthMfaRequiredException catch (error) {
      if (!mounted) return;
      setState(() {
        _mfaPatientId = error.patientId;
        _mfaChallengeId = error.challengeId;
        _mfaMethod = error.method;
        _mfaRecipientMasked = error.recipientMasked;
        _mfaDevPreviewCode = error.devPreviewCode;
        _mfaCodeController.clear();
        _errorMessage = '';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Login failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.darkText),
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
                    colors: [Color(0xFFE6F4D8), Color(0xFFCCE6B4)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(
                  children: [
                    Image.asset('assets/images/logo.png', height: 84),
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
                      'Sign in with your patient account to continue to your dashboard.',
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
                readOnly: _isMfaStep,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.username, AutofillHints.email],
                validator: (value) {
                  final input = (value ?? '').trim();
                  if (input.isEmpty) return 'Email is required';
                  final valid = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(input);
                  if (!valid) return 'Enter a valid email';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              if (_isMfaStep) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE9EFE3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Enter the 6-digit code sent via ${_mfaMethod.toUpperCase()} to ${_mfaRecipientMasked.isEmpty ? 'your account' : _mfaRecipientMasked}.',
                    style: const TextStyle(fontSize: 12, color: AppColors.bodyText),
                  ),
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _mfaCodeController,
                  label: 'Verification code',
                  hintText: '123456',
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.done,
                  validator: (value) {
                    final code = (value ?? '').trim();
                    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
                      return 'Enter a valid 6-digit code';
                    }
                    return null;
                  },
                ),
                if (_mfaDevPreviewCode.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE9EFE3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Dev code: $_mfaDevPreviewCode',
                      style: const TextStyle(fontSize: 12, color: AppColors.bodyText),
                    ),
                  ),
                ],
              ] else ...[
                AuthTextField(
                  controller: _passwordController,
                  label: 'Password',
                  hintText: 'Enter your password',
                  obscureText: !_showPassword,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.password],
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    ),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                  validator: (value) {
                    if ((value ?? '').isEmpty) {
                      return 'Password is required';
                    }
                    return null;
                  },
                ),
              ],
              if (_errorMessage.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEAEA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _errorMessage,
                    style: const TextStyle(
                      color: AppColors.danger,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              PrimaryButton(
                text: _isLoading
                    ? (_isMfaStep ? 'Verifying...' : 'Signing in...')
                    : (_isMfaStep ? 'Verify Code' : 'Log In'),
                onTap: _isLoading ? () {} : _submit,
              ),
              if (_isMfaStep) ...[
                const SizedBox(height: 10),
                TextButton(
                  onPressed: _isLoading
                      ? null
                      : () {
                          setState(() {
                            _mfaPatientId = '';
                            _mfaChallengeId = '';
                            _mfaMethod = 'email';
                            _mfaRecipientMasked = '';
                            _mfaDevPreviewCode = '';
                            _mfaCodeController.clear();
                            _errorMessage = '';
                          });
                        },
                  child: const Text(
                    'Use different account',
                    style: TextStyle(
                      color: AppColors.primaryBlue,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ] else ...[
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
              ],
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFE9EFE3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'API: ${AppConfig.apiBaseUrl}',
                  style: const TextStyle(fontSize: 11, color: AppColors.secondaryText),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
