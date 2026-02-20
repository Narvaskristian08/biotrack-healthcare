import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../../common/widgets/primary_button.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/services/auth_api_service.dart';

enum _VerificationStep { method, verify, complete }

class AccountVerificationPage extends StatefulWidget {
  const AccountVerificationPage({
    super.key,
    required this.patientId,
    this.email = '',
    this.contactNumber = '',
    this.healthCenterName = '',
    this.healthCenterLocation = '',
  });

  final String patientId;
  final String email;
  final String contactNumber;
  final String healthCenterName;
  final String healthCenterLocation;

  @override
  State<AccountVerificationPage> createState() =>
      _AccountVerificationPageState();
}

class _AccountVerificationPageState extends State<AccountVerificationPage> {
  final _api = AuthApiService();
  final _codeController = TextEditingController();

  _VerificationStep _step = _VerificationStep.method;
  String _method = 'email';
  bool _loading = false;
  String _errorMessage = '';
  String _successMessage = '';
  String _emailRecipient = '';
  String _smsRecipient = '';
  String _devPreviewCode = '';
  bool _autoCodeRequested = false;

  bool get _missingSession => widget.patientId.trim().isEmpty;

  bool get _hasHealthCenterInfo =>
      widget.healthCenterName.trim().isNotEmpty ||
      widget.healthCenterLocation.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _emailRecipient = widget.email.trim();
    _smsRecipient = _maskContactNumber(widget.contactNumber);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _missingSession || _autoCodeRequested) return;
      _autoCodeRequested = true;
      _requestCode('email');
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _requestCode(
    String method, {
    bool moveToVerifyStep = true,
  }) async {
    if (_missingSession) {
      setState(() {
        _errorMessage = 'Missing verification session. Please register again.';
      });
      return;
    }

    final normalizedMethod = method.trim().toLowerCase() == 'sms'
        ? 'sms'
        : 'email';

    setState(() {
      _loading = true;
      _errorMessage = '';
      _successMessage = '';
      _devPreviewCode = '';
      _method = normalizedMethod;
    });

    try {
      final result = await _api.sendPatientVerificationCode(
        patientId: widget.patientId,
        method: normalizedMethod,
      );

      final resolvedMethod = result.method.toLowerCase() == 'sms'
          ? 'sms'
          : 'email';
      final recipientMasked = result.recipientMasked.trim();

      final successParts = <String>[result.message];
      if (recipientMasked.isNotEmpty) {
        successParts.add('Recipient: $recipientMasked');
      }
      final devCode = result.devPreviewCode.trim();
      if (devCode.isNotEmpty) {
        successParts.add('Dev code: $devCode');
      }

      if (!mounted) return;
      setState(() {
        _method = resolvedMethod;
        _devPreviewCode = devCode;
        _successMessage = successParts.join(' | ');
        if (resolvedMethod == 'email' && recipientMasked.isNotEmpty) {
          _emailRecipient = recipientMasked;
        }
        if (resolvedMethod == 'sms' && recipientMasked.isNotEmpty) {
          _smsRecipient = recipientMasked;
        }
        if (moveToVerifyStep) {
          _step = _VerificationStep.verify;
          _codeController.clear();
        }
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Unable to send verification code.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _verifyCode() async {
    if (_missingSession) {
      setState(() {
        _errorMessage = 'Missing verification session. Please register again.';
      });
      return;
    }

    final code = _codeController.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() {
        _errorMessage = 'Please enter a valid 6-digit code.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = '';
      _successMessage = '';
    });

    try {
      final message = await _api.verifyPatientRegistrationCode(
        patientId: widget.patientId,
        method: _method,
        code: code,
      );

      if (!mounted) return;
      setState(() {
        _step = _VerificationStep.complete;
        _successMessage = message;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Verification failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _maskContactNumber(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return '';
    if (digits.length <= 4) return '*' * digits.length;
    return '${'*' * (digits.length - 4)}${digits.substring(digits.length - 4)}';
  }

  String _methodLabel(String method) {
    return method == 'sms' ? 'SMS' : 'email';
  }

  int get _currentStepIndex {
    if (_step == _VerificationStep.method) return 0;
    if (_step == _VerificationStep.verify) return 1;
    return 2;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.darkText),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFE5F3D6), Color(0xFFC7E2AD)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Verify Patient Account',
                    style: TextStyle(
                      fontSize: 25,
                      fontWeight: FontWeight.w800,
                      color: AppColors.darkText,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Complete OTP verification before you can log in.',
                    style: TextStyle(color: AppColors.bodyText, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (_hasHealthCenterInfo) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Selected Healthcare Location',
                      style: TextStyle(
                        color: AppColors.darkText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.healthCenterName.trim().isNotEmpty
                          ? widget.healthCenterName
                          : 'Healthcare Provider',
                      style: const TextStyle(
                        color: AppColors.darkText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (widget.healthCenterLocation.trim().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        widget.healthCenterLocation,
                        style: const TextStyle(color: AppColors.bodyText),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFFF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFCBEEDD)),
              ),
              child: Row(
                children: [
                  _StepPill(
                    label: 'Choose method',
                    active: _currentStepIndex >= 0,
                  ),
                  const SizedBox(width: 8),
                  _StepPill(label: 'Enter OTP', active: _currentStepIndex >= 1),
                  const SizedBox(width: 8),
                  _StepPill(label: 'Done', active: _currentStepIndex >= 2),
                ],
              ),
            ),
            if (_errorMessage.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
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
            if (_successMessage.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFFF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBEEDD)),
                ),
                child: Text(
                  _successMessage,
                  style: const TextStyle(
                    color: Color(0xFF0E6D48),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            if (_missingSession) ...[
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Verification session is missing.',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Please create your patient account again.',
                      style: TextStyle(color: AppColors.bodyText),
                    ),
                    const SizedBox(height: 12),
                    PrimaryButton(
                      text: 'Go to Signup',
                      onTap: () => context.go('/signup'),
                    ),
                  ],
                ),
              ),
            ] else ...[
              if (_step == _VerificationStep.method) ...[
                const SizedBox(height: 18),
                _VerificationMethodCard(
                  icon: Icons.email_outlined,
                  title: 'Email Verification',
                  subtitle: _emailRecipient.isNotEmpty
                      ? 'Send code to $_emailRecipient'
                      : 'Send code to your email address',
                  loading: _loading,
                  onTap: () => _requestCode('email'),
                ),
                const SizedBox(height: 10),
                _VerificationMethodCard(
                  icon: Icons.sms_outlined,
                  title: 'SMS Verification',
                  subtitle: _smsRecipient.isNotEmpty
                      ? 'Send code to $_smsRecipient'
                      : 'Send code to your mobile number',
                  loading: _loading,
                  onTap: () => _requestCode('sms'),
                ),
              ],
              if (_step == _VerificationStep.verify) ...[
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.mutedBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Enter the 6-digit code sent via ${_methodLabel(_method)}.',
                        style: const TextStyle(
                          color: AppColors.darkText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _codeController,
                        keyboardType: TextInputType.number,
                        autofillHints: const [AutofillHints.oneTimeCode],
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        decoration: InputDecoration(
                          labelText: 'Verification code',
                          hintText: '000000',
                          counterText: '',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(
                              color: AppColors.mutedBorder,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(
                              color: AppColors.primaryGreen,
                              width: 1.4,
                            ),
                          ),
                        ),
                      ),
                      if (_devPreviewCode.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Dev code: $_devPreviewCode',
                          style: const TextStyle(
                            color: AppColors.secondaryText,
                            fontSize: 12,
                          ),
                        ),
                      ],
                      const SizedBox(height: 14),
                      PrimaryButton(
                        text: _loading ? 'Verifying...' : 'Verify Code',
                        onTap: _loading ? () {} : _verifyCode,
                      ),
                      const SizedBox(height: 8),
                      PrimaryButton(
                        text: 'Change Method',
                        outlined: true,
                        onTap: _loading
                            ? () {}
                            : () => setState(() {
                                _step = _VerificationStep.method;
                                _codeController.clear();
                              }),
                      ),
                      const SizedBox(height: 6),
                      Align(
                        alignment: Alignment.center,
                        child: TextButton(
                          onPressed: _loading
                              ? null
                              : () => _requestCode(
                                  _method,
                                  moveToVerifyStep: false,
                                ),
                          child: const Text('Resend code'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (_step == _VerificationStep.complete) ...[
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.mutedBorder),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.verified_rounded,
                        color: Color(0xFF13985E),
                        size: 42,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Account Verified Successfully',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.darkText,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Your patient account is now ready for login.',
                        style: TextStyle(color: AppColors.bodyText),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 14),
                      PrimaryButton(
                        text: 'Go to Login',
                        onTap: () => context.go('/login'),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _StepPill extends StatelessWidget {
  const _StepPill({required this.label, required this.active});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF15A86B) : const Color(0xFFD8EFE2),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : const Color(0xFF5D7B70),
          ),
        ),
      ),
    );
  }
}

class _VerificationMethodCard extends StatelessWidget {
  const _VerificationMethodCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.loading,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Ink(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.mutedBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFECFFF4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: const Color(0xFF13985E)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.darkText,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.bodyText,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.secondaryText,
            ),
          ],
        ),
      ),
    );
  }
}
