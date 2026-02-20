import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../../common/widgets/primary_button.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../data/models/health_center_option.dart';
import '../../../data/services/auth_api_service.dart';
import '../../widgets/auth_text_field.dart';

class SignupPage extends StatefulWidget {
  const SignupPage({super.key});

  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  static final RegExp _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@(gmail|yahoo)\.com$',
  );
  static final RegExp _passwordRegex = RegExp(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+\[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()\-_=+\[\]{}|;:,.<>]{8,}$',
  );
  static final RegExp _nameRegex = RegExp(r"^[a-zA-Z\s\-']+$");

  final _formKey = GlobalKey<FormState>();
  final _api = AuthApiService();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _middleInitialController = TextEditingController();
  final _nameExtensionController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _addressController = TextEditingController();
  final _contactController = TextEditingController();

  List<HealthCenterOption> _healthCenters = const [];
  HealthCenterOption? _selectedCenter;

  bool _loadingCenters = true;
  bool _submitting = false;
  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _termsAccepted = false;
  String _centerErrorMessage = '';
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadHealthCenters();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _middleInitialController.dispose();
    _nameExtensionController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _addressController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  Future<void> _loadHealthCenters() async {
    setState(() {
      _loadingCenters = true;
      _centerErrorMessage = '';
    });

    try {
      final centers = await _api.listHealthCenters();
      if (!mounted) return;
      setState(() {
        _healthCenters = centers;
        _selectedCenter = null;
        if (centers.isEmpty) {
          _centerErrorMessage =
              'No active health center is available yet. Please contact your health center administrator.';
        }
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _centerErrorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _centerErrorMessage = 'Unable to load health centers.');
    } finally {
      if (mounted) {
        setState(() => _loadingCenters = false);
      }
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }
    if (_selectedCenter == null) {
      setState(() => _errorMessage = 'Please choose a health center.');
      return;
    }
    if (!_termsAccepted) {
      setState(
        () => _errorMessage = 'You must accept the terms and conditions.',
      );
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = '';
    });

    try {
      final registration = await _api.registerPatient(
        healthCenterId: _selectedCenter!.id,
        firstName: _firstNameController.text,
        lastName: _lastNameController.text,
        middleInitial: _middleInitialController.text,
        nameExtension: _nameExtensionController.text,
        email: _emailController.text,
        password: _passwordController.text,
        address: _addressController.text,
        contactNumber: _contactController.text,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Registration successful. Please verify your account before logging in.',
          ),
        ),
      );
      final selectedCenterName =
          registration.assignedHealthCenter?.displayName ??
          _selectedCenter!.primaryLabel;
      final selectedCenterLocation =
          registration.assignedHealthCenter?.locationLabel ??
          _selectedCenter!.subtitle;
      final verificationUri = Uri(
        path: '/account-verification',
        queryParameters: {
          'patientId': registration.patientId,
          'email': registration.email,
          'contactNumber': registration.contactNumber,
          if (selectedCenterName.trim().isNotEmpty)
            'healthCenterName': selectedCenterName.trim(),
          if (selectedCenterLocation.trim().isNotEmpty)
            'healthCenterLocation': selectedCenterLocation.trim(),
        },
      );
      context.go(verificationUri.toString());
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Registration failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  InputDecoration _dropdownDecoration(String label, {IconData? icon}) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(
        color: AppColors.darkText,
        fontWeight: FontWeight.w600,
      ),
      prefixIcon: icon == null
          ? null
          : Icon(icon, color: AppColors.secondaryText, size: 20),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFBFDACA), width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF12935F), width: 1.8),
      ),
    );
  }

  String? _requiredField(String? value, String label) {
    if ((value ?? '').trim().isEmpty) {
      return '$label is required';
    }
    return null;
  }

  String? _nameValidator(String? value, String label) {
    final input = (value ?? '').trim();
    if (input.isEmpty) {
      return '$label is required';
    }
    if (!_nameRegex.hasMatch(input)) {
      return '$label can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  }

  Widget _sectionHeading(String title, String subtitle) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF3FBF6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFCDE6D8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              color: AppColors.darkText,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            style: const TextStyle(
              color: AppColors.bodyText,
              fontSize: 12.5,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            const _AuthBackdrop(),
            AutofillGroup(
              child: Form(
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
                            'Patient Registration',
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
                            color: const Color(0xFF0F6F48).withValues(alpha: 0.24),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Create patient account',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              height: 1.1,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Register with your selected health center using your verified patient details.',
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
                    const Row(
                      children: [
                        _SignupStepChip(number: '1', label: 'Identity'),
                        SizedBox(width: 8),
                        _SignupStepChip(number: '2', label: 'Contact'),
                        SizedBox(width: 8),
                        _SignupStepChip(number: '3', label: 'Security'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.97),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFCDE5D8)),
                      ),
                      child: Column(
                        children: [
                          if (_loadingCenters)
                            const LinearProgressIndicator(minHeight: 3)
                          else if (_healthCenters.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF4E5),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFF3CF8A)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'No active health center yet.',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.darkText,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _centerErrorMessage.isNotEmpty
                                        ? _centerErrorMessage
                                        : 'Please contact your health center administrator.',
                                    style: const TextStyle(color: AppColors.bodyText),
                                  ),
                                  const SizedBox(height: 8),
                                  TextButton.icon(
                                    onPressed: _loadingCenters
                                        ? null
                                        : _loadHealthCenters,
                                    icon: const Icon(Icons.refresh, size: 18),
                                    label: const Text('Retry'),
                                  ),
                                ],
                              ),
                            )
                          else
                            DropdownButtonFormField<HealthCenterOption>(
                              initialValue: _selectedCenter,
                              isExpanded: true,
                              decoration: _dropdownDecoration(
                                'Health Center',
                                icon: Icons.apartment_rounded,
                              ),
                              items: _healthCenters
                                  .map(
                                    (center) => DropdownMenuItem<HealthCenterOption>(
                                      value: center,
                                      child: Text(
                                        center.primaryLabel,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  )
                                  .toList(growable: false),
                              onChanged: (value) =>
                                  setState(() => _selectedCenter = value),
                              validator: (value) =>
                                  value == null ? 'Health center is required' : null,
                            ),
                          if (_centerErrorMessage.isNotEmpty &&
                              _healthCenters.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: Text(
                                _centerErrorMessage,
                                style: const TextStyle(
                                  color: AppColors.danger,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          if (_selectedCenter != null &&
                              _selectedCenter!.subtitle.isNotEmpty) ...[
                            const SizedBox(height: 8),
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
                                _selectedCenter!.subtitle,
                                style: const TextStyle(
                                  color: Color(0xFF1F5C43),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 14),
                          _sectionHeading(
                            'Identity Information',
                            'Enter your legal patient name details.',
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: AuthTextField(
                                  controller: _firstNameController,
                                  label: 'First Name',
                                  hintText: 'Juan',
                                  textCapitalization: TextCapitalization.words,
                                  prefixIcon: const Icon(
                                    Icons.person_outline_rounded,
                                    color: AppColors.secondaryText,
                                  ),
                                  autofillHints: const [AutofillHints.givenName],
                                  validator: (value) =>
                                      _nameValidator(value, 'First name'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: AuthTextField(
                                  controller: _lastNameController,
                                  label: 'Last Name',
                                  hintText: 'Dela Cruz',
                                  textCapitalization: TextCapitalization.words,
                                  prefixIcon: const Icon(
                                    Icons.person_outline_rounded,
                                    color: AppColors.secondaryText,
                                  ),
                                  autofillHints: const [AutofillHints.familyName],
                                  validator: (value) =>
                                      _nameValidator(value, 'Last name'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: AuthTextField(
                                  controller: _middleInitialController,
                                  label: 'Middle Initial',
                                  hintText: 'D',
                                  maxLength: 1,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(
                                      RegExp('[a-zA-Z]'),
                                    ),
                                  ],
                                  textCapitalization: TextCapitalization.characters,
                                  prefixIcon: const Icon(
                                    Icons.badge_outlined,
                                    color: AppColors.secondaryText,
                                  ),
                                  validator: (value) {
                                    final input = (value ?? '').trim();
                                    if (input.isEmpty) {
                                      return 'Middle initial is required';
                                    }
                                    if (input.length != 1) {
                                      return 'Middle initial must be 1 character';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: AuthTextField(
                                  controller: _nameExtensionController,
                                  label: 'Name Extension',
                                  hintText: 'Jr. (optional)',
                                  textCapitalization: TextCapitalization.words,
                                  prefixIcon: const Icon(
                                    Icons.person_add_alt_rounded,
                                    color: AppColors.secondaryText,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          _sectionHeading(
                            'Contact Details',
                            'We use these details for verification and care updates.',
                          ),
                          const SizedBox(height: 12),
                          AuthTextField(
                            controller: _emailController,
                            label: 'Email',
                            hintText: 'your@gmail.com or your@yahoo.com',
                            keyboardType: TextInputType.emailAddress,
                            prefixIcon: const Icon(
                              Icons.mail_outline_rounded,
                              color: AppColors.secondaryText,
                            ),
                            autofillHints: const [AutofillHints.email],
                            validator: (value) {
                              final input = (value ?? '').trim();
                              if (input.isEmpty) return 'Email is required';
                              if (!_emailRegex.hasMatch(input)) {
                                return 'Please use a valid @gmail.com or @yahoo.com email';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          AuthTextField(
                            controller: _addressController,
                            label: 'Address',
                            hintText: '123 Main Street',
                            textCapitalization: TextCapitalization.words,
                            prefixIcon: const Icon(
                              Icons.location_on_outlined,
                              color: AppColors.secondaryText,
                            ),
                            autofillHints: const [AutofillHints.streetAddressLine1],
                            validator: (value) => _requiredField(value, 'Address'),
                          ),
                          const SizedBox(height: 12),
                          AuthTextField(
                            controller: _contactController,
                            label: 'Contact Number',
                            hintText: '09123456789',
                            keyboardType: TextInputType.phone,
                            prefixIcon: const Icon(
                              Icons.phone_outlined,
                              color: AppColors.secondaryText,
                            ),
                            inputFormatters: [
                              FilteringTextInputFormatter.allow(RegExp('[0-9+]')),
                            ],
                            autofillHints: const [AutofillHints.telephoneNumber],
                            validator: (value) => _requiredField(value, 'Contact number'),
                          ),
                          const SizedBox(height: 14),
                          _sectionHeading(
                            'Security',
                            'Choose a strong password for your patient account.',
                          ),
                          const SizedBox(height: 12),
                          AuthTextField(
                            controller: _passwordController,
                            label: 'Password',
                            hintText: 'At least 8 characters',
                            obscureText: !_showPassword,
                            prefixIcon: const Icon(
                              Icons.lock_outline_rounded,
                              color: AppColors.secondaryText,
                            ),
                            autofillHints: const [AutofillHints.newPassword],
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
                              final input = (value ?? '').trim();
                              if (input.isEmpty) return 'Password is required';
                              if (!_passwordRegex.hasMatch(input)) {
                                return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          AuthTextField(
                            controller: _confirmPasswordController,
                            label: 'Confirm Password',
                            hintText: 'Re-enter password',
                            obscureText: !_showConfirmPassword,
                            prefixIcon: const Icon(
                              Icons.lock_reset_rounded,
                              color: AppColors.secondaryText,
                            ),
                            autofillHints: const [AutofillHints.newPassword],
                            suffixIcon: IconButton(
                              icon: Icon(
                                _showConfirmPassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                              ),
                              onPressed: () => setState(
                                () => _showConfirmPassword = !_showConfirmPassword,
                              ),
                            ),
                            validator: (value) {
                              if ((value ?? '').isEmpty) {
                                return 'Please confirm your password';
                              }
                              if (value != _passwordController.text) {
                                return 'Passwords do not match';
                              }
                              return null;
                            },
                          ),
                          if (_selectedCenter != null) ...[
                            const SizedBox(height: 12),
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
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedCenter!.primaryLabel,
                                    style: const TextStyle(
                                      color: Color(0xFF1F5C43),
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.8,
                                    ),
                                  ),
                                  if (_selectedCenter!.subtitle.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      _selectedCenter!.subtitle,
                                      style: const TextStyle(
                                        color: AppColors.bodyText,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF7FCF9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.mutedBorder),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Checkbox(
                                  value: _termsAccepted,
                                  onChanged: (checked) {
                                    setState(() {
                                      _termsAccepted = checked == true;
                                    });
                                  },
                                ),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                    'I accept the terms and conditions and consent to health data processing for monitoring and care.',
                                    style: TextStyle(
                                      color: AppColors.darkText,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
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
                    ],
                    const SizedBox(height: 18),
                    PrimaryButton(
                      text: _submitting ? 'Creating account...' : 'Create Account',
                      onTap: _submitting ? () {} : _submit,
                    ),
                    const SizedBox(height: 6),
                    TextButton(
                      onPressed: _submitting ? null : () => context.go('/login'),
                      child: const Text(
                        'Already have an account? Log in',
                        style: TextStyle(
                          color: AppColors.primaryBlue,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SignupStepChip extends StatelessWidget {
  const _SignupStepChip({required this.number, required this.label});

  final String number;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFCCE5D8)),
          color: const Color(0xFFF3FBF6),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: 18,
              width: 18,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF12935F),
              ),
              child: Center(
                child: Text(
                  number,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF0F6F48),
                  fontSize: 11.2,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
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
