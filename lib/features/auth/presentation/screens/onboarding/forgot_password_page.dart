import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../../common/widgets/primary_button.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/services/auth_api_service.dart';
import '../../widgets/auth_text_field.dart';

enum _ForgotPasswordStep { requestCode, resetPassword, complete }

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key, this.initialEmail = ''});

  final String initialEmail;

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _api = AuthApiService();
  late final TextEditingController _emailController;
  final _codeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _loading = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  String _errorMessage = '';
  String _successMessage = '';
  String _devPreviewCode = '';
  _ForgotPasswordStep _step = _ForgotPasswordStep.requestCode;

  bool get _isRequestStep => _step == _ForgotPasswordStep.requestCode;
  bool get _isResetStep => _step == _ForgotPasswordStep.resetPassword;
  bool get _isCompleteStep => _step == _ForgotPasswordStep.complete;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail.trim());
  }

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool _isValidEmail(String value) {
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim());
  }

  Future<void> _requestCode() async {
    final email = _emailController.text.trim();
    if (!_isValidEmail(email)) {
      setState(() {
        _errorMessage = 'Enter a valid email address.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = '';
      _successMessage = '';
      _devPreviewCode = '';
    });

    try {
      final result = await _api.requestPatientPasswordResetCode(email: email);
      if (!mounted) return;
      setState(() {
        _step = _ForgotPasswordStep.resetPassword;
        _successMessage = result.message;
        _devPreviewCode = result.devPreviewCode.trim();
        _codeController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to send reset code.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (!_isValidEmail(email)) {
      setState(() {
        _errorMessage = 'Enter a valid email address.';
      });
      return;
    }
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() {
        _errorMessage = 'Enter a valid 6-digit reset code.';
      });
      return;
    }
    if (newPassword.isEmpty) {
      setState(() {
        _errorMessage = 'Enter a new password.';
      });
      return;
    }
    if (newPassword != confirmPassword) {
      setState(() {
        _errorMessage = 'Passwords do not match.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = '';
      _successMessage = '';
    });

    try {
      final message = await _api.resetPatientPasswordWithCode(
        email: email,
        code: code,
        newPassword: newPassword,
      );
      if (!mounted) return;
      setState(() {
        _step = _ForgotPasswordStep.complete;
        _successMessage = message;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to reset password. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
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
            const _ForgotPasswordBackdrop(),
            ListView(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
              children: [
                Row(
                  children: [
                    InkWell(
                      borderRadius: BorderRadius.circular(99),
                      onTap: () => context.go('/login'),
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
                        'Forgot Password',
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
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Recover your account',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          height: 1.1,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Request a reset code, then set a new password for your patient account.',
                        style: TextStyle(
                          color: Color(0xFFD4F7E7),
                          fontSize: 13.5,
                          height: 1.4,
                        ),
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
                      if (_successMessage.isNotEmpty) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAF9F2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFC6E9D8)),
                          ),
                          child: Text(
                            _successMessage,
                            style: const TextStyle(
                              color: Color(0xFF1F5C43),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      AuthTextField(
                        controller: _emailController,
                        label: 'Email address',
                        hintText: 'your@email.com',
                        readOnly: _isResetStep || _isCompleteStep,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [
                          AutofillHints.username,
                          AutofillHints.email,
                        ],
                        prefixIcon: const Icon(
                          Icons.mail_outline_rounded,
                          color: AppColors.secondaryText,
                        ),
                        validator: (_) => null,
                      ),
                      if (_isResetStep) ...[
                        const SizedBox(height: 12),
                        AuthTextField(
                          controller: _codeController,
                          label: 'Reset code',
                          hintText: '123456',
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.next,
                          inputFormatters: const [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          prefixIcon: const Icon(
                            Icons.pin_outlined,
                            color: AppColors.secondaryText,
                          ),
                          validator: (_) => null,
                        ),
                        const SizedBox(height: 12),
                        AuthTextField(
                          controller: _newPasswordController,
                          label: 'New password',
                          hintText: 'Enter your new password',
                          obscureText: !_showNewPassword,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.newPassword],
                          prefixIcon: const Icon(
                            Icons.lock_outline_rounded,
                            color: AppColors.secondaryText,
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _showNewPassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _showNewPassword = !_showNewPassword;
                              });
                            },
                          ),
                          validator: (_) => null,
                        ),
                        const SizedBox(height: 12),
                        AuthTextField(
                          controller: _confirmPasswordController,
                          label: 'Confirm new password',
                          hintText: 'Re-enter your new password',
                          obscureText: !_showConfirmPassword,
                          textInputAction: TextInputAction.done,
                          autofillHints: const [AutofillHints.newPassword],
                          prefixIcon: const Icon(
                            Icons.lock_reset_outlined,
                            color: AppColors.secondaryText,
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _showConfirmPassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _showConfirmPassword = !_showConfirmPassword;
                              });
                            },
                          ),
                          validator: (_) => null,
                        ),
                        if (_devPreviewCode.isNotEmpty) ...[
                          const SizedBox(height: 10),
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
                              'Dev code: $_devPreviewCode',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.bodyText,
                              ),
                            ),
                          ),
                        ],
                      ],
                      const SizedBox(height: 16),
                      if (_isRequestStep)
                        PrimaryButton(
                          text: _loading ? 'Sending code...' : 'Send Reset Code',
                          onTap: _loading ? () {} : _requestCode,
                        ),
                      if (_isResetStep)
                        PrimaryButton(
                          text: _loading ? 'Updating...' : 'Update Password',
                          onTap: _loading ? () {} : _resetPassword,
                        ),
                      if (_isCompleteStep)
                        PrimaryButton(
                          text: 'Back to Login',
                          onTap: () => context.go('/login'),
                        ),
                      if (_isResetStep) ...[
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: _loading ? null : _requestCode,
                          child: const Text(
                            'Resend code',
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
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ForgotPasswordBackdrop extends StatelessWidget {
  const _ForgotPasswordBackdrop();

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
          top: -140,
          right: -90,
          child: Container(
            height: 310,
            width: 310,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF20AA6D).withValues(alpha: 0.14),
            ),
          ),
        ),
        Positioned(
          bottom: -100,
          left: -55,
          child: Container(
            height: 240,
            width: 240,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryBlue.withValues(alpha: 0.12),
            ),
          ),
        ),
      ],
    );
  }
}
