import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  bool _rememberMe = true;
  String _errorMessage = '';
  String _mfaPatientId = '';
  String _mfaChallengeId = '';
  String _mfaMethod = 'email';
  String _mfaRecipientMasked = '';
  String _mfaDevPreviewCode = '';

  bool get _isMfaStep => _mfaPatientId.isNotEmpty && _mfaChallengeId.isNotEmpty;

  void _resetMfaFlow() {
    setState(() {
      _mfaPatientId = '';
      _mfaChallengeId = '';
      _mfaMethod = 'email';
      _mfaRecipientMasked = '';
      _mfaDevPreviewCode = '';
      _mfaCodeController.clear();
      _errorMessage = '';
    });
  }

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
              code: _mfaCodeController.text.trim(),
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
      body: SafeArea(
        child: Stack(
          children: [
            const _AuthBackdrop(),
            Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
                children: [
                  Row(
                    children: [
                      InkWell(
                        borderRadius: BorderRadius.circular(99),
                        onTap: () => context.pop(),
                        child: Container(
                          height: 38,
                          width: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.86),
                            border: Border.all(color: const Color(0xFFC8E2D4)),
                          ),
                          child: const Icon(
                            Icons.arrow_back_rounded,
                            color: AppColors.darkText,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(99),
                          color: Colors.white.withValues(alpha: 0.84),
                          border: Border.all(color: const Color(0xFFC8E2D4)),
                        ),
                        child: const Text(
                          'Patient Login',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F7A4E),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1CAA6D), Color(0xFF0E7A4E)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F6F48).withValues(alpha: 0.25),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(99),
                            color: Colors.white.withValues(alpha: 0.18),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.32),
                            ),
                          ),
                          child: const Text(
                            'Health Access',
                            style: TextStyle(
                              color: Color(0xFFCCF4E1),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Welcome back',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 29,
                            fontWeight: FontWeight.w800,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Sign in to access your BioTrack patient dashboard.',
                          style: TextStyle(
                            color: Color(0xFFD4F7E7),
                            fontSize: 13.5,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: const [
                            _HeroPill(text: 'Secure Login'),
                            _HeroPill(text: 'MFA + OTP'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.96),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFCDE5D8)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F6F48).withValues(alpha: 0.08),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        if (_errorMessage.isNotEmpty) ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFEAEA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFF3C6C6)),
                            ),
                            child: Text(
                              _errorMessage,
                              style: const TextStyle(
                                color: AppColors.danger,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        AuthTextField(
                          controller: _emailController,
                          label: 'Email address',
                          hintText: 'your@gmail.com or your@yahoo.com',
                          readOnly: _isMfaStep,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [
                            AutofillHints.username,
                            AutofillHints.email,
                          ],
                          prefixIcon: const Icon(
                            Icons.mail_outline_rounded,
                            color: AppColors.secondaryText,
                          ),
                          validator: (value) {
                            final input = (value ?? '').trim();
                            if (input.isEmpty) return 'Email is required';
                            final valid = RegExp(
                              r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                            ).hasMatch(input);
                            if (!valid) return 'Enter a valid email';
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        if (_isMfaStep) ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFAF2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFBDE7D2)),
                            ),
                            child: Text(
                              'Enter the 6-digit code sent via ${_mfaMethod.toUpperCase()} to ${_mfaRecipientMasked.isEmpty ? 'your account' : _mfaRecipientMasked}.',
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: Color(0xFF1F5C43),
                                height: 1.35,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          AuthTextField(
                            controller: _mfaCodeController,
                            label: 'Verification code',
                            hintText: '123456',
                            keyboardType: TextInputType.number,
                            textInputAction: TextInputAction.done,
                            inputFormatters: const [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(6),
                            ],
                            prefixIcon: const Icon(
                              Icons.verified_user_outlined,
                              color: AppColors.secondaryText,
                            ),
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
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE9EFE3),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Dev code: $_mfaDevPreviewCode',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.bodyText,
                                ),
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
                            prefixIcon: const Icon(
                              Icons.lock_outline_rounded,
                              color: AppColors.secondaryText,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _showPassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                              ),
                              onPressed: () =>
                                  setState(() => _showPassword = !_showPassword),
                            ),
                            validator: (value) {
                              if ((value ?? '').isEmpty) {
                                return 'Password is required';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              SizedBox(
                                width: 24,
                                height: 24,
                                child: Checkbox(
                                  value: _rememberMe,
                                  onChanged: (checked) => setState(
                                    () => _rememberMe = checked == true,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'Remember this device',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    color: AppColors.bodyText,
                                  ),
                                ),
                              ),
                            ],
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
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _isLoading ? null : _resetMfaFlow,
                            child: const Text(
                              'Use different account',
                              style: TextStyle(
                                color: AppColors.primaryBlue,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ] else ...[
                          const SizedBox(height: 8),
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
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFC8E2D4)),
                    ),
                    child: Text(
                      'API: ${AppConfig.apiBaseUrl}',
                      style: const TextStyle(
                        fontSize: 11.2,
                        color: AppColors.secondaryText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(99),
        color: Colors.white.withValues(alpha: 0.16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFFCBF2DF),
          fontSize: 11.2,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFEFF8F2), Color(0xFFDCEFE1)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        Positioned(
          top: -150,
          right: -80,
          child: Container(
            height: 320,
            width: 320,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF20AA6D).withValues(alpha: 0.14),
            ),
          ),
        ),
        Positioned(
          top: 210,
          left: -95,
          child: Container(
            height: 240,
            width: 240,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFB5E1C9).withValues(alpha: 0.62),
            ),
          ),
        ),
        Positioned(
          bottom: -105,
          right: -45,
          child: Container(
            height: 250,
            width: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryBlue.withValues(alpha: 0.13),
            ),
          ),
        ),
      ],
    );
  }
}
