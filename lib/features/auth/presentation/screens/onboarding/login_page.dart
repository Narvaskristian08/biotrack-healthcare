import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_radii.dart';
import '../../../../../core/theme/app_spacing.dart';
import '../../../../../core/widgets/app_ui.dart';
import '../../../data/services/auth_api_service.dart';
import '../../../data/services/auth_session_store.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_scaffold.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/trust_chip.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final AuthApiService _api = AuthApiService();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _mfaCodeController = TextEditingController();

  bool _isLoading = false;
  bool _showPassword = false;
  bool _rememberMe = true;
  String _errorMessage = '';
  String _mfaPatientId = '';
  String _mfaChallengeId = '';
  String _mfaMethod = 'email';
  String _mfaRecipientMasked = '';

  bool get _isMfaStep => _mfaPatientId.isNotEmpty && _mfaChallengeId.isNotEmpty;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _mfaCodeController.dispose();
    super.dispose();
  }

  void _resetMfaFlow() {
    setState(() {
      _mfaPatientId = '';
      _mfaChallengeId = '';
      _mfaMethod = 'email';
      _mfaRecipientMasked = '';
      _mfaCodeController.clear();
      _errorMessage = '';
    });
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();

    if (_isMfaStep) {
      final String code = _mfaCodeController.text.trim();
      if (!RegExp(r'^\d{6}$').hasMatch(code)) {
        setState(() => _errorMessage = 'Enter the 6-digit verification code.');
        return;
      }
    } else {
      final FormState? form = _formKey.currentState;
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
        _mfaCodeController.clear();
        _errorMessage = '';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Login failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildRememberDeviceRow(BuildContext context) {
    final theme = Theme.of(context).textTheme;

    return InkWell(
      onTap: _isLoading
          ? null
          : () => setState(() => _rememberMe = !_rememberMe),
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FAF8),
          borderRadius: BorderRadius.circular(AppRadii.md),
          border: Border.all(color: AppColors.mutedBorder),
        ),
        child: Row(
          children: <Widget>[
            IgnorePointer(
              child: Checkbox(value: _rememberMe, onChanged: (_) {}),
            ),
            const SizedBox(width: AppSpacing.xs),
            Expanded(
              child: Text(
                'Remember this device for faster secure sign-in.',
                style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;

    return AuthScaffold(
      child: Form(
        key: _formKey,
        child: AuthScrollView(
          children: <Widget>[
            AuthTopBar(
              onBack: () => context.pop(),
              contextLabel: _isMfaStep
                  ? 'Patient Verification'
                  : 'Patient Login',
            ),
            const SizedBox(height: AppSpacing.lg),
            AuthHeroHeader(
              eyebrow: _isMfaStep ? 'Secure Verification' : 'Secure Login',
              title: _isMfaStep
                  ? 'Verify your sign-in'
                  : 'Securely access your health records',
              subtitle: _isMfaStep
                  ? 'Enter the verification code to continue to your BioTrack patient dashboard.'
                  : 'Sign in to review health readings, AI guidance, and privacy-protected records.',
              icon: _isMfaStep
                  ? Icons.verified_user_outlined
                  : Icons.lock_person_outlined,
              footer: Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: <Widget>[
                  const TrustChip(
                    label: 'Privacy Protected',
                    icon: Icons.shield_outlined,
                    tone: TrustChipTone.accent,
                  ),
                  TrustChip(
                    label: _isMfaStep
                        ? 'Verification Required'
                        : 'Patient Access',
                    icon: _isMfaStep
                        ? Icons.verified_outlined
                        : Icons.badge_outlined,
                  ),
                ],
              ),
            ),
            if (_errorMessage.isNotEmpty) ...<Widget>[
              const SizedBox(height: AppSpacing.lg),
              AppInfoBanner(
                title: 'Unable to continue',
                message: _errorMessage,
                tone: AppTone.danger,
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            AuthCard(
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      _isMfaStep ? 'Verification code' : 'Patient sign in',
                      style: theme.titleLarge,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      _isMfaStep
                          ? 'Use the 6-digit code sent to your registered contact method.'
                          : 'Use the email and password linked to your patient account.',
                      style: theme.bodySmall?.copyWith(
                        color: AppColors.bodyText,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    AuthTextField(
                      controller: _emailController,
                      label: 'Email address',
                      hintText: 'name@example.com',
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      readOnly: _isMfaStep,
                      autofillHints: const <String>[
                        AutofillHints.username,
                        AutofillHints.email,
                      ],
                      prefixIcon: const Icon(Icons.mail_outline_rounded),
                      validator: (String? value) {
                        final String input = (value ?? '').trim();
                        if (input.isEmpty) return 'Email is required';
                        final bool isValid = RegExp(
                          r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                        ).hasMatch(input);
                        if (!isValid) return 'Enter a valid email address';
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (_isMfaStep) ...<Widget>[
                      AppInfoBanner(
                        title: 'Code sent',
                        message:
                            'Enter the 6-digit code sent via ${_mfaMethod.toUpperCase()} to ${_mfaRecipientMasked.isEmpty ? 'your account' : _mfaRecipientMasked}.',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      AuthTextField(
                        controller: _mfaCodeController,
                        label: 'Verification code',
                        hintText: '123456',
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        prefixIcon: const Icon(Icons.password_rounded),
                        inputFormatters: <TextInputFormatter>[
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        helperText: 'Enter the code exactly as received.',
                        validator: (String? value) {
                          final String code = (value ?? '').trim();
                          if (!RegExp(r'^\d{6}$').hasMatch(code)) {
                            return 'Enter a valid 6-digit code';
                          }
                          return null;
                        },
                      ),
                    ] else ...<Widget>[
                      AuthTextField(
                        controller: _passwordController,
                        label: 'Password',
                        hintText: 'Enter your password',
                        obscureText: !_showPassword,
                        textInputAction: TextInputAction.done,
                        autofillHints: const <String>[AutofillHints.password],
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          onPressed: () {
                            setState(() => _showPassword = !_showPassword);
                          },
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                        validator: (String? value) {
                          if ((value ?? '').isEmpty) {
                            return 'Password is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _buildRememberDeviceRow(context),
                      const SizedBox(height: AppSpacing.xs),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _isLoading
                              ? null
                              : () => context.push(
                                  '/forgot-password?email=${Uri.encodeComponent(_emailController.text.trim())}',
                                ),
                          child: const Text('Forgot password?'),
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _submit,
                        icon: Icon(
                          _isMfaStep
                              ? Icons.verified_outlined
                              : Icons.login_rounded,
                          size: 18,
                        ),
                        label: Text(
                          _isLoading
                              ? (_isMfaStep ? 'Verifying...' : 'Signing in...')
                              : (_isMfaStep ? 'Verify Code' : 'Log In'),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    if (_isMfaStep)
                      Align(
                        alignment: Alignment.center,
                        child: TextButton(
                          onPressed: _isLoading ? null : _resetMfaFlow,
                          child: const Text('Use a different account'),
                        ),
                      )
                    else
                      Align(
                        alignment: Alignment.center,
                        child: TextButton(
                          onPressed: _isLoading
                              ? null
                              : () => context.push('/signup'),
                          child: const Text('Create patient account'),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AuthCard(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF7F3),
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                    child: const Icon(
                      Icons.privacy_tip_outlined,
                      size: 18,
                      color: AppColors.primaryGreenDark,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'BioTrack protects sign-in access with privacy-focused account security and verified records.',
                      style: theme.bodySmall?.copyWith(
                        color: AppColors.bodyText,
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
