import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_radii.dart';
import '../../../../../core/theme/app_spacing.dart';
import '../../../../../core/widgets/app_ui.dart';
import '../../../data/models/health_center_option.dart';
import '../../../data/services/auth_api_service.dart';
import '../../widgets/auth_action_bar.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/auth_scaffold.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/progress_stepper.dart';
import '../../widgets/trust_chip.dart';

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

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final AuthApiService _api = AuthApiService();

  final TextEditingController _cityFilterController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _middleInitialController =
      TextEditingController();
  final TextEditingController _nameExtensionController =
      TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _contactController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

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

  List<ProgressStepData> get _progressSteps => _stepLabels
      .map((String label) => ProgressStepData(label: label))
      .toList(growable: false);

  List<String> get _cityOptions {
    final Set<String> cities = <String>{};
    for (final HealthCenterOption center in _healthCenters) {
      final String city = center.cityMunicipality.trim();
      if (city.isNotEmpty) {
        cities.add(city);
      }
    }

    final List<String> values = cities.toList()..sort();
    return values;
  }

  List<HealthCenterOption> get _filteredHealthCenters {
    final String filter = _normalizeCity(_cityFilter);
    if (filter.isEmpty) {
      return _healthCenters;
    }

    return _healthCenters
        .where((HealthCenterOption center) {
          return _normalizeCity(center.cityMunicipality).contains(filter);
        })
        .toList(growable: false);
  }

  bool get _hasAnyHealthCenters => _healthCenters.isNotEmpty;

  bool get _hasCentersInCity {
    if (_cityFilter.isEmpty) {
      return false;
    }

    return _filteredHealthCenters.isNotEmpty;
  }

  HealthCenterOption? get _selectedHealthCenter {
    final HealthCenterOption? current = _selectedCenter;
    if (current == null) {
      return null;
    }

    for (final HealthCenterOption center in _healthCenters) {
      if (center.id == current.id) {
        return center;
      }
    }

    return current;
  }

  Future<void> _loadHealthCenters() async {
    setState(() {
      _loadingCenters = true;
      _centerErrorMessage = '';
    });

    try {
      final List<HealthCenterOption> centers = await _api.listHealthCenters();
      if (!mounted) return;

      setState(() {
        _healthCenters = centers;
        _selectedCenter = null;
        _centerErrorMessage = centers.isEmpty
            ? 'No active barangay clinics are available yet. Ask your administrator to activate a clinic profile.'
            : '';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _centerErrorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _centerErrorMessage = 'Unable to load health centers right now.';
      });
    } finally {
      if (mounted) {
        setState(() => _loadingCenters = false);
      }
    }
  }

  void _handleCityChanged(String value) {
    final bool isSelectionValid =
        _selectedCenter != null &&
        _filteredHealthCenters.any(
          (HealthCenterOption center) => center.id == _selectedCenter!.id,
        );

    setState(() {
      _errorMessage = '';
      if (!isSelectionValid) {
        _selectedCenter = null;
      }
    });
  }

  String? _requiredField(String? value, String label) {
    if ((value ?? '').trim().isEmpty) {
      return '$label is required';
    }
    return null;
  }

  String? _nameValidator(String? value, String label) {
    final String input = (value ?? '').trim();
    if (input.isEmpty) {
      return '$label is required';
    }
    if (!_nameRegex.hasMatch(input)) {
      return '$label can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  }

  String? _validateActiveStep() {
    if (_step == 1) {
      if (_cityFilter.isEmpty) {
        return 'Please enter your city or municipality.';
      }
      if (!_hasAnyHealthCenters) {
        return 'BioTrack is not available in your area yet. Ask your local health office to onboard.';
      }
      if (_selectedCenter == null) {
        if (!_hasCentersInCity) {
          return 'No active health centers found in $_cityFilter.';
        }
        return 'Please select a health center.';
      }
    }

    if (_step == 3 && !_termsAccepted) {
      return 'Please accept the terms and consent to continue.';
    }

    return null;
  }

  bool _validateCurrentStep() {
    final bool formValid = _formKey.currentState?.validate() ?? false;
    final String? customError = _validateActiveStep();
    setState(() => _errorMessage = customError ?? '');
    return formValid && customError == null;
  }

  void _handleNext() {
    FocusScope.of(context).unfocus();
    if (!_validateCurrentStep()) {
      return;
    }

    setState(() {
      _errorMessage = '';
      _step = _step < _stepLabels.length ? _step + 1 : _step;
    });
  }

  void _handleBack() {
    FocusScope.of(context).unfocus();
    setState(() {
      _errorMessage = '';
      if (_step > 1) {
        _step -= 1;
      }
    });
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_validateCurrentStep()) {
      return;
    }

    final HealthCenterOption? selectedCenter = _selectedHealthCenter;
    if (selectedCenter == null) {
      setState(() => _errorMessage = 'Please select a health center.');
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = '';
    });

    try {
      final PatientRegistrationResult registration = await _api.registerPatient(
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

      final String centerName =
          registration.assignedHealthCenter?.displayName ??
          selectedCenter.primaryLabel;
      final String centerLocation =
          registration.assignedHealthCenter?.locationLabel ??
          selectedCenter.subtitle;

      final Uri verificationUri = Uri(
        path: '/account-verification',
        queryParameters: <String, String>{
          'patientId': registration.patientId,
          'email': registration.email,
          'contactNumber': registration.contactNumber,
          if (centerName.trim().isNotEmpty)
            'healthCenterName': centerName.trim(),
          if (centerLocation.trim().isNotEmpty)
            'healthCenterLocation': centerLocation.trim(),
        },
      );

      context.go(verificationUri.toString());
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Registration failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Widget _buildFieldPair(Widget first, Widget second) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        if (constraints.maxWidth < 560) {
          return Column(
            children: <Widget>[
              first,
              const SizedBox(height: AppSpacing.md),
              second,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Expanded(child: first),
            const SizedBox(width: AppSpacing.md),
            Expanded(child: second),
          ],
        );
      },
    );
  }

  Widget _buildCitySuggestions() {
    if (_loadingCenters) {
      return const SizedBox.shrink();
    }

    if (_cityOptions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: AppSpacing.sm),
        child: AppInfoBanner(
          title: 'No city list yet',
          message:
              'Ask your administrator to complete clinic profiles so BioTrack can suggest available areas.',
          tone: AppTone.warning,
        ),
      );
    }

    final String filter = _normalizeCity(_cityFilter);
    final List<String> suggestions = _cityOptions
        .where((String city) {
          if (filter.isEmpty) {
            return true;
          }
          return _normalizeCity(city).contains(filter);
        })
        .take(6)
        .toList(growable: false);

    if (suggestions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(top: AppSpacing.sm),
        child: Text(
          'You can still type your city manually. Available health centers will appear once BioTrack is active there.',
          style: TextStyle(fontSize: 12, color: AppColors.secondaryText),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Wrap(
        spacing: AppSpacing.xs,
        runSpacing: AppSpacing.xs,
        children: suggestions
            .map((String city) {
              return ActionChip(
                label: Text(city),
                onPressed: () {
                  _cityFilterController.text = city;
                  _handleCityChanged(city);
                },
                backgroundColor: const Color(0xFFF3F8F5),
                side: const BorderSide(color: AppColors.mutedBorder),
                labelStyle: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.primaryGreenDark,
                ),
              );
            })
            .toList(growable: false),
      ),
    );
  }

  Widget _buildSelectedCenterSummary() {
    final HealthCenterOption? center = _selectedHealthCenter;
    if (center == null) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F7F3),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: const Color(0xFFD4E4DB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Row(
            children: <Widget>[
              Icon(
                Icons.local_hospital_outlined,
                size: 18,
                color: AppColors.primaryGreenDark,
              ),
              SizedBox(width: AppSpacing.xs),
              Text(
                'Linked health center',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryGreenDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            center.primaryLabel,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          if (center.subtitle.isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpacing.xxs),
            Text(
              center.subtitle,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: AppColors.bodyText),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildIdentityStep() {
    final HealthCenterOption? dropdownValue =
        _filteredHealthCenters.any(
          (HealthCenterOption center) => center.id == _selectedCenter?.id,
        )
        ? _selectedCenter
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        AuthSectionCard(
          title: 'Health center linkage',
          subtitle:
              'Link your account to the clinic that will manage your patient access.',
          icon: Icons.local_hospital_outlined,
          action: TextButton.icon(
            onPressed: _loadingCenters ? null : _loadHealthCenters,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Refresh'),
          ),
          child: Column(
            children: <Widget>[
              AuthTextField(
                controller: _cityFilterController,
                label: 'City or municipality',
                hintText: _loadingCenters
                    ? 'Loading available areas...'
                    : 'Enter your city or municipality',
                textCapitalization: TextCapitalization.words,
                prefixIcon: const Icon(Icons.location_city_outlined),
                helperText:
                    'Start with your city to see nearby health centers.',
                onChanged: _handleCityChanged,
                validator: (String? value) {
                  if ((value ?? '').trim().isEmpty) {
                    return 'Please enter your city or municipality';
                  }
                  return null;
                },
              ),
              _buildCitySuggestions(),
              const SizedBox(height: AppSpacing.md),
              if (_loadingCenters)
                const _SignupCentersLoadingState()
              else if (_healthCenters.isEmpty)
                AppInfoBanner(
                  title: 'No active health center yet',
                  message: _centerErrorMessage.isNotEmpty
                      ? _centerErrorMessage
                      : 'Please contact your health center administrator.',
                  tone: AppTone.warning,
                  action: TextButton(
                    onPressed: _loadHealthCenters,
                    child: const Text('Retry'),
                  ),
                )
              else
                AuthDropdownField<HealthCenterOption>(
                  label: 'Health center',
                  hintText: _cityFilter.isEmpty
                      ? 'Select your city first'
                      : 'Select your health center',
                  helperText:
                      'Choose the health center that will receive your patient registration.',
                  prefixIcon: const Icon(Icons.apartment_rounded),
                  value: dropdownValue,
                  items: _filteredHealthCenters
                      .map((HealthCenterOption center) {
                        return DropdownMenuItem<HealthCenterOption>(
                          value: center,
                          child: Text(
                            center.primaryLabel,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      })
                      .toList(growable: false),
                  onChanged:
                      _cityFilter.isEmpty || _filteredHealthCenters.isEmpty
                      ? null
                      : (HealthCenterOption? value) {
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
              if (_selectedHealthCenter != null) ...<Widget>[
                const SizedBox(height: AppSpacing.md),
                _buildSelectedCenterSummary(),
              ],
              if (!_loadingCenters &&
                  _cityFilter.isNotEmpty &&
                  _filteredHealthCenters.isEmpty) ...<Widget>[
                const SizedBox(height: AppSpacing.md),
                AppInfoBanner(
                  title: 'No active health centers found',
                  message:
                      'We could not find an active health center in $_cityFilter right now.',
                  tone: AppTone.warning,
                ),
              ],
              if (_centerErrorMessage.isNotEmpty &&
                  _healthCenters.isNotEmpty) ...<Widget>[
                const SizedBox(height: AppSpacing.md),
                AppInfoBanner(
                  message: _centerErrorMessage,
                  tone: AppTone.warning,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AuthSectionCard(
          title: 'Legal name',
          subtitle: 'Use the same name shown on your patient records.',
          icon: Icons.badge_outlined,
          child: Column(
            children: <Widget>[
              _buildFieldPair(
                AuthTextField(
                  controller: _lastNameController,
                  label: 'Last name',
                  hintText: 'Dela Cruz',
                  textCapitalization: TextCapitalization.words,
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                  validator: (String? value) =>
                      _nameValidator(value, 'Last name'),
                ),
                AuthTextField(
                  controller: _firstNameController,
                  label: 'First name',
                  hintText: 'Juan',
                  textCapitalization: TextCapitalization.words,
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                  validator: (String? value) =>
                      _nameValidator(value, 'First name'),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              _buildFieldPair(
                AuthTextField(
                  controller: _middleInitialController,
                  label: 'Middle initial',
                  hintText: 'A',
                  maxLength: 1,
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: <TextInputFormatter>[
                    FilteringTextInputFormatter.allow(RegExp('[a-zA-Z]')),
                  ],
                  prefixIcon: const Icon(Icons.short_text_rounded),
                  validator: (String? value) {
                    final String input = (value ?? '').trim();
                    if (input.isEmpty) {
                      return 'Middle initial is required';
                    }
                    if (input.length != 1) {
                      return 'Middle initial must be 1 character';
                    }
                    return null;
                  },
                ),
                AuthTextField(
                  controller: _nameExtensionController,
                  label: 'Name extension',
                  hintText: 'Jr.',
                  secondaryLabel: 'Optional',
                  textCapitalization: TextCapitalization.words,
                  prefixIcon: const Icon(Icons.person_add_alt_rounded),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildContactStep() {
    return AuthSectionCard(
      title: 'Contact details',
      subtitle:
          'We use these details for verification, recovery, and care updates.',
      icon: Icons.contact_mail_outlined,
      child: Column(
        children: <Widget>[
          AuthTextField(
            controller: _emailController,
            label: 'Email address',
            hintText: 'your@gmail.com or your@yahoo.com',
            keyboardType: TextInputType.emailAddress,
            prefixIcon: const Icon(Icons.mail_outline_rounded),
            helperText: 'Use a @gmail.com or @yahoo.com email address.',
            validator: (String? value) {
              final String input = (value ?? '').trim();
              if (input.isEmpty) {
                return 'Email is required';
              }
              if (!_emailRegex.hasMatch(input)) {
                return 'Please use a valid @gmail.com or @yahoo.com email';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.md),
          AuthTextField(
            controller: _addressController,
            label: 'Address',
            hintText: '123 Main Street',
            textCapitalization: TextCapitalization.words,
            prefixIcon: const Icon(Icons.location_on_outlined),
            validator: (String? value) => _requiredField(value, 'Address'),
          ),
          const SizedBox(height: AppSpacing.md),
          AuthTextField(
            controller: _contactController,
            label: 'Contact number',
            hintText: '09123456789',
            keyboardType: TextInputType.phone,
            prefixIcon: const Icon(Icons.phone_outlined),
            helperText: 'Use the number your health center can reach.',
            inputFormatters: <TextInputFormatter>[
              FilteringTextInputFormatter.allow(RegExp('[0-9+]')),
            ],
            validator: (String? value) =>
                _requiredField(value, 'Contact number'),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        AuthSectionCard(
          title: 'Security setup',
          subtitle: 'Create a strong password for your patient account.',
          icon: Icons.lock_outline_rounded,
          child: Column(
            children: <Widget>[
              AuthTextField(
                controller: _passwordController,
                label: 'Password',
                hintText: 'At least 8 characters',
                obscureText: !_showPassword,
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
                  final String input = (value ?? '').trim();
                  if (input.isEmpty) {
                    return 'Password is required';
                  }
                  if (!_passwordRegex.hasMatch(input)) {
                    return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.md),
              AuthTextField(
                controller: _confirmPasswordController,
                label: 'Confirm password',
                hintText: 'Re-enter password',
                obscureText: !_showConfirmPassword,
                prefixIcon: const Icon(Icons.lock_reset_rounded),
                suffixIcon: IconButton(
                  onPressed: () {
                    setState(
                      () => _showConfirmPassword = !_showConfirmPassword,
                    );
                  },
                  icon: Icon(
                    _showConfirmPassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                  ),
                ),
                validator: (String? value) {
                  if ((value ?? '').isEmpty) {
                    return 'Please confirm your password';
                  }
                  if (value != _passwordController.text) {
                    return 'Passwords do not match';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.md),
              const AppInfoBanner(
                title: 'Password requirements',
                message:
                    'Use at least 8 characters with uppercase, lowercase, a number, and a special character.',
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AuthSectionCard(
          title: 'Review and consent',
          subtitle: 'Confirm your details before creating your account.',
          icon: Icons.verified_user_outlined,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (_selectedHealthCenter != null) _buildSelectedCenterSummary(),
              if (_selectedHealthCenter != null)
                const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: const <Widget>[
                  TrustChip(
                    label: 'Identity',
                    icon: Icons.badge_outlined,
                    tone: TrustChipTone.accent,
                  ),
                  TrustChip(
                    label: 'Contact',
                    icon: Icons.contact_mail_outlined,
                    tone: TrustChipTone.accent,
                  ),
                  TrustChip(
                    label: 'Security',
                    icon: Icons.lock_outline_rounded,
                    tone: TrustChipTone.accent,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              InkWell(
                onTap: _submitting
                    ? null
                    : () {
                        setState(() {
                          _termsAccepted = !_termsAccepted;
                          if (_termsAccepted) {
                            _errorMessage = '';
                          }
                        });
                      },
                borderRadius: BorderRadius.circular(AppRadii.md),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAF8),
                    borderRadius: BorderRadius.circular(AppRadii.md),
                    border: Border.all(color: AppColors.mutedBorder),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      IgnorePointer(
                        child: Checkbox(
                          value: _termsAccepted,
                          onChanged: (_) {},
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      const Expanded(
                        child: Text(
                          'I accept the terms and conditions and consent to health data processing for monitoring and care.',
                          style: TextStyle(
                            color: AppColors.darkText,
                            height: 1.4,
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

  @override
  Widget build(BuildContext context) {
    final TextTheme theme = Theme.of(context).textTheme;
    final bool isFinalStep = _step == _stepLabels.length;

    return AuthScaffold(
      child: Form(
        key: _formKey,
        child: AuthScrollView(
          children: <Widget>[
            AuthTopBar(
              onBack: () => context.pop(),
              contextLabel: 'Patient Registration',
            ),
            const SizedBox(height: AppSpacing.lg),
            const AuthHeroHeader(
              eyebrow: 'Create account',
              title: 'Create your patient account',
              subtitle:
                  'Link your account to your health center and complete the guided registration flow.',
              icon: Icons.person_add_alt_1_outlined,
              footer: Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: <Widget>[
                  TrustChip(
                    label: 'Guided registration',
                    icon: Icons.route_outlined,
                    tone: TrustChipTone.accent,
                  ),
                  TrustChip(
                    label: 'Secure patient access',
                    icon: Icons.verified_user_outlined,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            ProgressStepper(currentStep: _step, steps: _progressSteps),
            if (_errorMessage.isNotEmpty) ...<Widget>[
              const SizedBox(height: AppSpacing.lg),
              AppInfoBanner(
                title: 'Please review this step',
                message: _errorMessage,
                tone: AppTone.danger,
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            AuthCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(_stepLabels[_step - 1], style: theme.titleLarge),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    _step == 1
                        ? 'Link your account and add your identity details.'
                        : _step == 2
                        ? 'Add the contact details used for patient communication.'
                        : 'Set your password and review consent before finishing.',
                    style: theme.bodySmall?.copyWith(color: AppColors.bodyText),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: KeyedSubtree(
                      key: ValueKey<int>(_step),
                      child: _buildStepBody(),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AuthActionBar(
                    layout: AuthActionBarLayout.row,
                    primaryLabel: _submitting
                        ? 'Creating account...'
                        : isFinalStep
                        ? 'Create Account'
                        : 'Next',
                    onPrimary: _submitting
                        ? null
                        : isFinalStep
                        ? _submit
                        : _handleNext,
                    primaryIcon: isFinalStep
                        ? Icons.check_circle_outline_rounded
                        : Icons.arrow_forward_rounded,
                    secondaryLabel: _step == 1 ? null : 'Back',
                    onSecondary: _step == 1 || _submitting ? null : _handleBack,
                    secondaryIcon: Icons.arrow_back_rounded,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Align(
                    alignment: Alignment.center,
                    child: TextButton(
                      onPressed: _submitting
                          ? null
                          : () => context.go('/login'),
                      child: const Text('Already have an account? Log in'),
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

class _SignupCentersLoadingState extends StatelessWidget {
  const _SignupCentersLoadingState();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: <Widget>[
        LinearProgressIndicator(minHeight: 3),
        SizedBox(height: AppSpacing.md),
        AppSkeletonBlock(height: 54, radius: AppRadii.lg),
        SizedBox(height: AppSpacing.sm),
        AppSkeletonParagraph(lines: 2, lineHeight: 12, lastLineFactor: 0.46),
      ],
    );
  }
}
