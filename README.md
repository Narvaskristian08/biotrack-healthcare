## Getting Started

### src/
- **config/**: Configuration files including database, blockchain, and environment-specific settings.  
- **controllers/**: Handles incoming HTTP requests and sends responses. Keep controllers thin, delegate logic to services.
- **middleware/**: Reusable middleware functions for authentication, logging, validation, or error handling.
- **models/**: Database or blockchain schema definitions.  
- **routes/**: Define API endpoints and link them to controllers. Organize routes by feature.  
- **services/**: Business logic including AI, blockchain integration, and analytics.  
- **utils/**: Generic helper functions used across the project.  
- **index.js**: Main entry point that initializes the server and connects middleware and routes.

### root
- **.env**: Stores environment variables (API keys, secrets).
- **.gitignore**: Specifies files and folders Git should ignore.
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

### Checkout backend branch

```bash
git checkout backend
### Checkout mobile branch

```bash
git checkout mobile
```

### Install dependencies

```bash
npm install
```

### IMPORTANT: Create .env file

Copy `env.example` to `.env` and set your values:

```bash
cp env.example .env
```

For blockchain identity + integrity anchoring, set:

- `BLOCKCHAIN_ENABLED=true`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

Keep `BLOCKCHAIN_ENABLED=false` for local/off-chain mode.

### Start the server

```bash
npm start
```

### Run in development mode (auto-reload)

```bash
npm run dev
```

## Blockchain Features

- Patient and health center registration now creates a blockchain identity reference.
- Identity metadata is saved in MongoDB and optionally anchored on-chain.
- Patient record creation computes a deterministic record hash and can anchor proof on-chain.
- New integrity endpoint:
  - `GET /api/patients/:patientId/records/:recordId/verify`
  - Recomputes DB hash, compares stored hash, and verifies on-chain proof when available.

## Testing Guide

For full end-to-end testing instructions, read:

- Blockchain and integrity testing: `README-TESTING-BLOCKCHAIN.md`
- Flutter mobile testing (auth + live scan + sensors): `README-TESTING-MOBILE.md`

Useful Flutter checks:

```bash
flutter pub get
flutter pub outdated
flutter analyze
flutter test
```
