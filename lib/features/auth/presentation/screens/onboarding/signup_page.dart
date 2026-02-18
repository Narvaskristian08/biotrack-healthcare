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
  final _formKey = GlobalKey<FormState>();
  final _api = AuthApiService();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _middleInitialController = TextEditingController();
  final _nameExtensionController = TextEditingController();
  final _mrnController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _addressController = TextEditingController();
  final _contactController = TextEditingController();
  final _birthDateController = TextEditingController();
  final _guardianController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();

  List<HealthCenterOption> _healthCenters = const [];
  HealthCenterOption? _selectedCenter;
  DateTime? _selectedBirthDate;
  String? _selectedSex;

  bool _loadingCenters = true;
  bool _submitting = false;
  bool _showPassword = false;
  bool _showConfirmPassword = false;
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
    _mrnController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _addressController.dispose();
    _contactController.dispose();
    _birthDateController.dispose();
    _guardianController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
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
        _selectedCenter = centers.isNotEmpty ? centers.first : null;
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

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedBirthDate ?? DateTime(now.year - 18, now.month, now.day),
      firstDate: DateTime(now.year - 120),
      lastDate: now,
    );
    if (picked == null) return;
    setState(() {
      _selectedBirthDate = picked;
      _birthDateController.text = _formatDate(picked);
    });
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
    if (_selectedBirthDate == null) {
      setState(() => _errorMessage = 'Birth date is required.');
      return;
    }
    if (_selectedSex == null || _selectedSex!.isEmpty) {
      setState(() => _errorMessage = 'Sex is required.');
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = '';
    });

    try {
      await _api.registerPatient(
        healthCenterId: _selectedCenter!.id,
        firstName: _firstNameController.text,
        lastName: _lastNameController.text,
        middleInitial: _middleInitialController.text,
        nameExtension: _nameExtensionController.text,
        mrn: _mrnController.text,
        email: _emailController.text,
        password: _passwordController.text,
        address: _addressController.text,
        contactNumber: _contactController.text,
        birthDate: _selectedBirthDate!.toIso8601String(),
        sex: _selectedSex ?? '',
        guardianName: _guardianController.text,
        emergencyContactName: _emergencyNameController.text,
        emergencyContactPhone: _emergencyPhoneController.text,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registration successful. You can now log in.')),
      );
      context.go('/login');
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

  String _formatDate(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  InputDecoration _dropdownDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(
        color: AppColors.darkText,
        fontWeight: FontWeight.w600,
      ),
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
          width: 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(
          color: AppColors.primaryGreen,
          width: 1.4,
        ),
      ),
    );
  }

  String? _requiredField(String? value, String label) {
    if ((value ?? '').trim().isEmpty) {
      return '$label is required';
    }
    return null;
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
        child: AutofillGroup(
          child: Form(
            key: _formKey,
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
                        'Create Patient Account',
                        style: TextStyle(
                          fontSize: 25,
                          fontWeight: FontWeight.w800,
                          color: AppColors.darkText,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Fill in all required patient details to complete registration.',
                        style: TextStyle(color: AppColors.bodyText, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
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
                          'Health Center',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppColors.darkText,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _centerErrorMessage.isNotEmpty
                              ? _centerErrorMessage
                              : 'No health center information is available right now.',
                          style: const TextStyle(color: AppColors.bodyText),
                        ),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: _loadingCenters ? null : _loadHealthCenters,
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
                    decoration: _dropdownDecoration('Health Center'),
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
                    onChanged: (value) => setState(() => _selectedCenter = value),
                    validator: (value) => value == null ? 'Health center is required' : null,
                  ),
                if (_centerErrorMessage.isNotEmpty && _healthCenters.isNotEmpty)
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
                if (_selectedCenter != null && _selectedCenter!.subtitle.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8, left: 2),
                    child: Text(
                      _selectedCenter!.subtitle,
                      style: const TextStyle(color: AppColors.secondaryText, fontSize: 12),
                    ),
                  ),
                const SizedBox(height: 16),
                const Text(
                  'Personal Information',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkText,
                  ),
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
                        autofillHints: const [AutofillHints.givenName],
                        validator: (value) => _requiredField(value, 'First name'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: AuthTextField(
                        controller: _lastNameController,
                        label: 'Last Name',
                        hintText: 'Dela Cruz',
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.familyName],
                        validator: (value) => _requiredField(value, 'Last name'),
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
                          FilteringTextInputFormatter.allow(RegExp('[a-zA-Z]')),
                        ],
                        textCapitalization: TextCapitalization.characters,
                        validator: (value) => _requiredField(value, 'Middle initial'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: AuthTextField(
                        controller: _nameExtensionController,
                        label: 'Name Extension',
                        hintText: 'Jr. (optional)',
                        textCapitalization: TextCapitalization.words,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _birthDateController,
                  label: 'Birth Date',
                  hintText: 'YYYY-MM-DD',
                  readOnly: true,
                  onTap: _pickBirthDate,
                  prefixIcon: const Icon(Icons.calendar_today_outlined),
                  validator: (value) => _requiredField(value, 'Birth date'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _selectedSex,
                  decoration: _dropdownDecoration('Sex'),
                  items: const [
                    DropdownMenuItem(value: 'male', child: Text('Male')),
                    DropdownMenuItem(value: 'female', child: Text('Female')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) => setState(() => _selectedSex = value),
                  validator: (value) => value == null || value.isEmpty ? 'Sex is required' : null,
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _mrnController,
                  label: 'MRN',
                  hintText: 'Medical record number (optional)',
                ),
                const SizedBox(height: 16),
                const Text(
                  'Account Credentials',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _emailController,
                  label: 'Email',
                  hintText: 'name@example.com',
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  validator: (value) {
                    final input = (value ?? '').trim();
                    if (input.isEmpty) return 'Email is required';
                    final valid = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(input);
                    if (!valid) return 'Enter a valid email';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _passwordController,
                  label: 'Password',
                  hintText: 'At least 8 characters',
                  obscureText: !_showPassword,
                  autofillHints: const [AutofillHints.newPassword],
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    ),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                  validator: (value) {
                    final input = value ?? '';
                    if (input.length < 8) {
                      return 'Use at least 8 characters';
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
                    if ((value ?? '').isEmpty) return 'Please confirm your password';
                    if (value != _passwordController.text) {
                      return 'Passwords do not match';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                const Text(
                  'Contact Details',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _addressController,
                  label: 'Address',
                  hintText: 'Barangay / street address',
                  textCapitalization: TextCapitalization.words,
                  autofillHints: const [AutofillHints.streetAddressLine1],
                  validator: (value) => _requiredField(value, 'Address'),
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _contactController,
                  label: 'Contact Number',
                  hintText: '09XXXXXXXXX',
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp('[0-9+]')),
                  ],
                  autofillHints: const [AutofillHints.telephoneNumber],
                  validator: (value) {
                    final input = (value ?? '').trim();
                    if (input.isEmpty) return 'Contact number is required';
                    if (input.length < 10) return 'Enter a valid contact number';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _guardianController,
                  label: 'Guardian Name',
                  hintText: 'Optional',
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _emergencyNameController,
                  label: 'Emergency Contact Name',
                  hintText: 'Required for emergencies',
                  textCapitalization: TextCapitalization.words,
                  validator: (value) => _requiredField(value, 'Emergency contact name'),
                ),
                const SizedBox(height: 12),
                AuthTextField(
                  controller: _emergencyPhoneController,
                  label: 'Emergency Contact Number',
                  hintText: '09XXXXXXXXX',
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp('[0-9+]')),
                  ],
                  validator: (value) {
                    final input = (value ?? '').trim();
                    if (input.isEmpty) return 'Emergency contact number is required';
                    if (input.length < 10) return 'Enter a valid contact number';
                    return null;
                  },
                ),
                if (_errorMessage.isNotEmpty) ...[
                  const SizedBox(height: 12),
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
      ),
    );
  }
}
