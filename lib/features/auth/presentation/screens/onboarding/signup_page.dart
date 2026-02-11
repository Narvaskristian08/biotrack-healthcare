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
  final _addressController = TextEditingController();
  final _contactController = TextEditingController();

  List<HealthCenterOption> _healthCenters = const [];
  HealthCenterOption? _selectedCenter;

  bool _loadingCenters = true;
  bool _submitting = false;
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
    _addressController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  Future<void> _loadHealthCenters() async {
    setState(() {
      _loadingCenters = true;
      _errorMessage = '';
    });
    try {
      final centers = await _api.listHealthCenters();
      if (!mounted) {
        return;
      }
      setState(() {
        _healthCenters = centers;
        _selectedCenter = centers.isNotEmpty ? centers.first : null;
      });
    } on AuthApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'Unable to load health centers.';
      });
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
      );

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration successful. You can now log in.'),
        ),
      );
      context.go('/login');
    } on AuthApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = 'Registration failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
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
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              const Text(
                'Create Patient Account',
                style: TextStyle(
                  fontSize: 27,
                  fontWeight: FontWeight.w800,
                  color: AppColors.darkText,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Register using your health center and personal details.',
                style: TextStyle(color: AppColors.bodyText),
              ),
              const SizedBox(height: 18),
              _loadingCenters
                  ? const LinearProgressIndicator(minHeight: 3)
                  : DropdownButtonFormField<HealthCenterOption>(
                      key: ValueKey(_selectedCenter?.id ?? 'none'),
                      initialValue: _selectedCenter,
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: 'Health Center',
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
                            color: Color(0xFFDCE5D9),
                            width: 1,
                          ),
                        ),
                      ),
                      items: _healthCenters
                          .map(
                            (center) => DropdownMenuItem<HealthCenterOption>(
                              value: center,
                              child: Text(center.name),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) =>
                          setState(() => _selectedCenter = value),
                    ),
              if (_selectedCenter != null &&
                  _selectedCenter!.subtitle.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8, left: 2),
                  child: Text(
                    _selectedCenter!.subtitle,
                    style: const TextStyle(color: Colors.black54, fontSize: 12),
                  ),
                ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: AuthTextField(
                      controller: _firstNameController,
                      label: 'First Name',
                      hintText: 'Juan',
                      textCapitalization: TextCapitalization.words,
                      validator: (value) =>
                          (value ?? '').trim().isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: AuthTextField(
                      controller: _lastNameController,
                      label: 'Last Name',
                      hintText: 'Dela Cruz',
                      textCapitalization: TextCapitalization.words,
                      validator: (value) =>
                          (value ?? '').trim().isEmpty ? 'Required' : null,
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
                      validator: (value) =>
                          ((value ?? '').trim().isEmpty) ? 'Required' : null,
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
                controller: _mrnController,
                label: 'MRN',
                hintText: 'Optional medical record number',
              ),
              const SizedBox(height: 12),
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
                hintText: 'At least 8 characters',
                obscureText: true,
                validator: (value) {
                  if ((value ?? '').length < 8) {
                    return 'Use at least 8 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              AuthTextField(
                controller: _addressController,
                label: 'Address',
                hintText: 'Barangay / street address',
                textCapitalization: TextCapitalization.words,
                validator: (value) =>
                    (value ?? '').trim().isEmpty ? 'Address is required' : null,
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
                validator: (value) => (value ?? '').trim().isEmpty
                    ? 'Contact number is required'
                    : null,
              ),
              if (_errorMessage.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage,
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontWeight: FontWeight.w600,
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
    );
  }
}
