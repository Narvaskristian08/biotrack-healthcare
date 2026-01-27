## Getting Started

### android/
- Native Android project for platform-specific integrations.

### assets/
- **images/**: Image assets.
- **icons/**: Icon assets.
- **fonts/**: Custom font files.

### integration_test/
- End-to-end tests that run on real devices or emulators.
- Simulates full user flows across multiple screens (login, scan, results, etc.).
- Example: `app_test.dart` for testing navigation and interactions.

### ios/
- Native iOS project for platform-specific integrations.

### lib/
- **core/**: App-wide infrastructure, configuration, services, and routing.
- **common/**: Shared widgets, models, and extensions reused across features.
- **features/**: Feature-based modules following clean architecture.
- **main.dart**: Main entry point that initializes the app, routing, themes, and providers.

### lib/common/
- **widgets/**: Shared UI components such as buttons, loaders, and dialogs.
- **models/**: Shared data models used across features.
- **extensions/**: Dart extensions for common utilities.

### lib/core/
- **config/**: Environment configuration, API base URLs, and app-level settings.
- **constants/**: Centralized constants such as colors, strings, and dimensions.
- **utils/**: Generic helper functions used across the project.
- **theme/**: Light and dark theme configurations.
- **services/**: Reusable low-level services including API clients, secure storage, notifications, sensors, and platform channels.
- **routes/**: Application routing using GoRouter.

### lib/features/
- **data/**: Repositories, data sources, and data models.
- **domain/**: Business logic and use cases.
- **presentation/**: UI layer containing screens, widgets, and controllers.
- **providers/**: State management providers (Riverpod / Bloc).

### test/
- Unit, widget, and integration tests. Structure mirrors the `lib/` directory.

### root
- **.gitignore**: Specifies files and folders Git should ignore.
- **pubspec.yaml**: Defines Flutter dependencies, assets, and project configuration.
- **README.md**: Project documentation.

## Quick Setup 

### Clone the repository

```bash
git clone https://github.com/dev-jsc0f1eld/biotrack-healthcare.git
cd biotrack-healthcare
```

### Checkout mobile branch

```bash
git checkout mobile
```

### Install dependencies

```bash
flutter pub get
flutter pub outdated
```
