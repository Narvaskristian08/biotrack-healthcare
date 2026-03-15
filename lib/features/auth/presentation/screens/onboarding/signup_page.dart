import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

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
  static const List<String> _stepLabels = <String>[
    'Identity',
    'Contact',
    'Security',
  ];

  final _formKey = GlobalKey<FormState>();
  final _api = AuthApiService();

  final _cityFilterController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _middleInitialController = TextEditingController();
  final _nameExtensionController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _contactController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  List<HealthCenterOption> _healthCenters = const <HealthCenterOption>[];
  HealthCenterOption? _selectedCenter;

  int _step = 1;
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
    _cityFilterController.dispose();
    _lastNameController.dispose();
    _firstNameController.dispose();
    _middleInitialController.dispose();
    _nameExtensionController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _contactController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String get _cityFilter => _cityFilterController.text.trim();

  String _normalizeCity(String value) => value.trim().toLowerCase();

  List<String> get _cityOptions {
    final cities = <String>{};
    for (final center in _healthCenters) {
      final city = center.cityMunicipality.trim();
      if (city.isNotEmpty) cities.add(city);
    }
    final values = cities.toList()..sort((a, b) => a.compareTo(b));
    return values;
  }

  List<HealthCenterOption> get _filteredHealthCenters {
    final filter = _normalizeCity(_cityFilter);
    if (filter.isEmpty) return _healthCenters;
    return _healthCenters.where((center) {
      return _normalizeCity(center.cityMunicipality).contains(filter);
    }).toList(growable: false);
  }

  bool get _hasAnyHealthCenters => _healthCenters.isNotEmpty;

  bool get _hasCentersInCity {
    if (_cityFilter.isEmpty) return false;
    return _filteredHealthCenters.isNotEmpty;
  }

  HealthCenterOption? get _selectedHealthCenter {
    final current = _selectedCenter;
    if (current == null) return null;
    for (final center in _healthCenters) {
      if (center.id == current.id) return center;
    }
    return current;
  }

  double get _progressValue => _step / _stepLabels.length;

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
        _centerErrorMessage = centers.isEmpty
            ? 'No active barangay clinics are available yet. Ask your administrator to set a clinic status to active.'
            : '';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _centerErrorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _centerErrorMessage = 'Unable to load health centers right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingCenters = false;
        });
      }
    }
  }

  void _handleCityChanged(String value) {
    final isSelectionValid = _selectedCenter != null &&
        _filteredHealthCenters.any((center) => center.id == _selectedCenter!.id);
    setState(() {
      _errorMessage = '';
      if (!isSelectionValid) {
        _selectedCenter = null;
      }
    });
  }

  String? _requiredField(String? value, String label) {
    if ((value ?? '').trim().isEmpty) return '$label is required';
    return null;
  }

  String? _nameValidator(String? value, String label) {
    final input = (value ?? '').trim();
    if (input.isEmpty) return '$label is required';
    if (!_nameRegex.hasMatch(input)) {
      return '$label can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  }

  String? _validateActiveStep() {
    if (_step == 1) {
      if (_cityFilter.isEmpty) {
        return 'Please enter your city or municipality';
      }
      if (!_hasAnyHealthCenters) {
        return 'BioTrack is not available in your area yet. Ask your local health office to onboard.';
      }
      if (_selectedCenter == null) {
        if (!_hasCentersInCity) {
          return 'No active health centers found in $_cityFilter.';
        }
        return 'Please select a health center';
      }
    }
    if (_step == 3 && !_termsAccepted) {
      return 'You must accept the terms and conditions';
    }
    return null;
  }

  bool _validateCurrentStep() {
    final formValid = _formKey.currentState?.validate() ?? false;
    final customError = _validateActiveStep();
    setState(() {
      _errorMessage = customError ?? '';
    });
    return formValid && customError == null;
  }

  void _handleNext() {
    FocusScope.of(context).unfocus();
    if (!_validateCurrentStep()) return;
    setState(() {
      _errorMessage = '';
      _step = _step < _stepLabels.length ? _step + 1 : _step;
    });
  }

  void _handleBack() {
    FocusScope.of(context).unfocus();
    setState(() {
      _errorMessage = '';
      if (_step > 1) _step -= 1;
    });
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_validateCurrentStep()) return;

    final selectedCenter = _selectedHealthCenter;
    if (selectedCenter == null) {
      setState(() {
        _errorMessage = 'Please select a health center';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = '';
    });

    try {
      final registration = await _api.registerPatient(
        healthCenterId: selectedCenter.id,
        lastName: _lastNameController.text,
        firstName: _firstNameController.text,
        middleInitial: _middleInitialController.text,
        nameExtension: _nameExtensionController.text,
        email: _emailController.text,
        password: _passwordController.text,
        address: _addressController.text,
        contactNumber: _contactController.text,
      );

      if (!mounted) return;

      final centerName =
          registration.assignedHealthCenter?.displayName ??
          selectedCenter.primaryLabel;
      final centerLocation =
          registration.assignedHealthCenter?.locationLabel ??
          selectedCenter.subtitle;

      final verificationUri = Uri(
        path: '/account-verification',
        queryParameters: <String, String>{
          'patientId': registration.patientId,
          'email': registration.email,
          'contactNumber': registration.contactNumber,
          if (centerName.trim().isNotEmpty) 'healthCenterName': centerName.trim(),
          if (centerLocation.trim().isNotEmpty)
            'healthCenterLocation': centerLocation.trim(),
        },
      );

      context.go(verificationUri.toString());
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Registration failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  Widget _buildSectionHeading(String title, String subtitle) {
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
        children: <Widget>[
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

  InputDecoration _inputDecoration({
    required String label,
    required String hintText,
    IconData? icon,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hintText,
      hintStyle: const TextStyle(color: Color(0xFF8FA398)),
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
        borderSide: const BorderSide(color: Color(0xFFDCE5D9), width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(
          color: AppColors.primaryBlue,
          width: 1.4,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.4),
      ),
    );
  }

  Widget _buildCitySuggestions() {
    if (_loadingCenters) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text(
          'Loading cities...',
          style: TextStyle(fontSize: 12, color: AppColors.secondaryText),
        ),
      );
    }

    if (_cityOptions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text(
          'No cities are available yet. Ask your administrator to complete clinic profiles.',
          style: TextStyle(fontSize: 12, color: Color(0xFFA86C00)),
        ),
      );
    }

    final filter = _normalizeCity(_cityFilter);
    final suggestions = _cityOptions.where((city) {
      if (filter.isEmpty) return true;
      return _normalizeCity(city).contains(filter);
    }).take(6).toList(growable: false);

    if (suggestions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text(
          'You can type any city. Health centers appear once BioTrack is active in your area.',
          style: TextStyle(fontSize: 12, color: AppColors.secondaryText),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: suggestions.map((city) {
          return ActionChip(
            label: Text(city),
            onPressed: () {
              _cityFilterController.text = city;
              _handleCityChanged(city);
            },
          );
        }).toList(growable: false),
      ),
    );
  }

  Widget _buildIdentityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _buildSectionHeading(
          'Identity Information',
          'Select your city first, then choose an active health center and enter your legal patient name details.',
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cityFilterController,
          textCapitalization: TextCapitalization.words,
          decoration: _inputDecoration(
            label: 'City / Municipality',
            hintText: _loadingCenters
                ? 'Loading cities...'
                : 'Enter your city or municipality',
            icon: Icons.location_city_outlined,
          ),
          onChanged: _handleCityChanged,
          validator: (value) {
            if ((value ?? '').trim().isEmpty) {
              return 'Please enter your city or municipality';
            }
            return null;
          },
        ),
        _buildCitySuggestions(),
        const SizedBox(height: 12),
        if (_loadingCenters)
          const LinearProgressIndicator(minHeight: 3)
        else if (_healthCenters.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4E5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF3CF8A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
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
                  onPressed: _loadingCenters ? null : _loadHealthCenters,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Retry'),
                ),
              ],
            ),
          )
        else
          DropdownButtonFormField<HealthCenterOption>(
            key: ValueKey<String>(
              '${_cityFilterController.text}_${_selectedCenter?.id ?? 'none'}',
            ),
            initialValue: _selectedCenter,
            isExpanded: true,
            decoration: _inputDecoration(
              label: 'Health Center',
              hintText: _cityFilter.isEmpty
                  ? 'Select your city first'
                  : 'Select your health center',
              icon: Icons.apartment_rounded,
            ),
            items: _filteredHealthCenters.map((center) {
              return DropdownMenuItem<HealthCenterOption>(
                value: center,
                child: Text(
                  center.primaryLabel,
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(growable: false),
            onChanged: _cityFilter.isEmpty || _filteredHealthCenters.isEmpty
                ? null
                : (value) {
                    setState(() {
                      _selectedCenter = value;
                      _errorMessage = '';
                    });
                  },
            validator: (_) {
              if (_cityFilter.isEmpty) return null;
              if (_selectedCenter == null) {
                if (!_hasCentersInCity) {
                  return 'No active health centers found in $_cityFilter.';
                }
                return 'Please select a health center';
              }
              return null;
            },
          ),
        if (_selectedHealthCenter != null &&
            _selectedHealthCenter!.subtitle.isNotEmpty) ...<Widget>[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFECFAF2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBDE7D2)),
            ),
            child: Text(
              _selectedHealthCenter!.subtitle,
              style: const TextStyle(
                color: Color(0xFF1F5C43),
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ],
        if (!_loadingCenters &&
            _cityFilter.isNotEmpty &&
            _filteredHealthCenters.isEmpty) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            'No active health centers found in $_cityFilter.',
            style: const TextStyle(fontSize: 12, color: Color(0xFFA86C00)),
          ),
        ],
        if (_centerErrorMessage.isNotEmpty && _healthCenters.isNotEmpty) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            _centerErrorMessage,
            style: const TextStyle(fontSize: 12, color: Color(0xFFA86C00)),
          ),
        ],
        const SizedBox(height: 14),
        Row(
          children: <Widget>[
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
                validator: (value) => _nameValidator(value, 'Last name'),
              ),
            ),
            const SizedBox(width: 10),
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
                validator: (value) => _nameValidator(value, 'First name'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: <Widget>[
            Expanded(
              child: AuthTextField(
                controller: _middleInitialController,
                label: 'Middle Initial',
                hintText: 'A',
                maxLength: 1,
                inputFormatters: <TextInputFormatter>[
                  FilteringTextInputFormatter.allow(RegExp('[a-zA-Z]')),
                ],
                textCapitalization: TextCapitalization.characters,
                prefixIcon: const Icon(
                  Icons.badge_outlined,
                  color: AppColors.secondaryText,
                ),
                validator: (value) {
                  final input = (value ?? '').trim();
                  if (input.isEmpty) return 'Middle initial is required';
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
      ],
    );
  }

  Widget _buildContactStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _buildSectionHeading(
          'Contact Details',
          'We use these details for verification and care updates.',
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _emailController,
          label: 'Email Address',
          hintText: 'your@gmail.com or your@yahoo.com',
          keyboardType: TextInputType.emailAddress,
          prefixIcon: const Icon(
            Icons.mail_outline_rounded,
            color: AppColors.secondaryText,
          ),
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
          inputFormatters: <TextInputFormatter>[
            FilteringTextInputFormatter.allow(RegExp('[0-9+]')),
          ],
          validator: (value) => _requiredField(value, 'Contact number'),
        ),
      ],
    );
  }

  Widget _buildSecurityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _buildSectionHeading(
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
          suffixIcon: IconButton(
            icon: Icon(
              _showPassword
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
            ),
            onPressed: () {
              setState(() {
                _showPassword = !_showPassword;
              });
            },
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
        if (_selectedHealthCenter != null) ...<Widget>[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFECFAF2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBDE7D2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  _selectedHealthCenter!.primaryLabel,
                  style: const TextStyle(
                    color: Color(0xFF1F5C43),
                    fontWeight: FontWeight.w700,
                    fontSize: 12.8,
                  ),
                ),
                if (_selectedHealthCenter!.subtitle.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 2),
                  Text(
                    _selectedHealthCenter!.subtitle,
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
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF7FCF9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.mutedBorder),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Checkbox(
                value: _termsAccepted,
                onChanged: (checked) {
                  setState(() {
                    _termsAccepted = checked == true;
                    if (_termsAccepted) _errorMessage = '';
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
    );
  }

  Widget _buildStepBody() {
    switch (_step) {
      case 1:
        return _buildIdentityStep();
      case 2:
        return _buildContactStep();
      case 3:
        return _buildSecurityStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildActionRow() {
    final isFinalStep = _step == _stepLabels.length;
    final primaryLabel = _submitting
        ? 'Creating account...'
        : isFinalStep
            ? 'Create Account'
            : 'Next';

    return Row(
      children: <Widget>[
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _step == 1 || _submitting ? null : _handleBack,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF1F3C30),
              side: const BorderSide(color: Color(0xFFCFE5D9)),
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            icon: const Icon(Icons.arrow_back_rounded, size: 18),
            label: const Text('Back'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _submitting
                ? null
                : isFinalStep
                    ? _submit
                    : _handleNext,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F8F60),
              foregroundColor: Colors.white,
              elevation: 0,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            icon: const Icon(Icons.arrow_forward_rounded, size: 18),
            label: Text(primaryLabel),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: <Widget>[
            const _AuthBackdrop(),
            Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
                children: <Widget>[
                  Row(
                    children: <Widget>[
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
                        colors: <Color>[Color(0xFF1CAA6D), Color(0xFF0E7A4E)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: <BoxShadow>[
                        BoxShadow(
                          color: const Color(0xFF0F6F48).withValues(alpha: 0.24),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
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
                          'Complete the guided flow to register securely.',
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
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.97),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFCDE5D8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            minHeight: 10,
                            value: _progressValue,
                            backgroundColor: const Color(0xFFE6F4ED),
                            color: const Color(0xFF12935F),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: List<Widget>.generate(_stepLabels.length, (
                            index,
                          ) {
                            return Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(
                                  right: index == _stepLabels.length - 1 ? 0 : 8,
                                ),
                                child: _SignupStepChip(
                                  number: '${index + 1}',
                                  label: _stepLabels[index],
                                  active: index + 1 <= _step,
                                ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                  if (_errorMessage.isNotEmpty) ...<Widget>[
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
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.97),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFCDE5D8)),
                    ),
                    child: Column(
                      children: <Widget>[
                        _buildStepBody(),
                        const SizedBox(height: 18),
                        _buildActionRow(),
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
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SignupStepChip extends StatelessWidget {
  const _SignupStepChip({
    required this.number,
    required this.label,
    required this.active,
  });

  final String number;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: active ? const Color(0xFFBDE7D2) : const Color(0xFFD8E7DE),
        ),
        color: active ? const Color(0xFFF3FBF6) : const Color(0xFFF8FBF9),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Container(
            height: 18,
            width: 18,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: active ? const Color(0xFF12935F) : const Color(0xFFB8C7BE),
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
              style: TextStyle(
                color: active ? const Color(0xFF0F6F48) : AppColors.secondaryText,
                fontSize: 11.2,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: <Widget>[
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: <Color>[Color(0xFFEFF8F2), Color(0xFFDCEFE1)],
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
