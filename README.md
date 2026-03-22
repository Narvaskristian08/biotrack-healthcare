# BioTrack Healthcare Monorepo

This repository contains:
- `backend/`: Express + MongoDB API
- `web/`: Next.js web app
- `lib/`, `android/`, `ios/`: Flutter mobile app

## Local Requirements

- Node.js 20.9+ (required for `web/` with Next.js 16)
- npm 9+
- MongoDB running locally or remotely
- Flutter SDK (only for mobile development/testing)

## Install Dependencies

From repo root:

```bash
npm install
```

## Environment Setup

Use the centralized env onboarding guide:
- `README-ENV.md`

Quick start:

```bash
cp backend/env.example backend/.env
cp web/.env.example web/.env.local
```

PowerShell:

```powershell
Copy-Item backend/env.example backend/.env
Copy-Item web/.env.example web/.env.local
```

## Run Locally (Fixed Web Port)

Run in two terminals from repo root:

Terminal 1 (backend):

```bash
npm run dev:backend
```

Terminal 2 (web, fixed to `127.0.0.1:3001`):

```bash
npm --workspace web run dev -- --hostname 127.0.0.1 --port 3001
```

URLs:
- Backend API: `http://127.0.0.1:3000/api`
- Web app: `http://127.0.0.1:3001`

## Run As Desktop App (Electron)

From repo root:

```bash
npm run dev:desktop
```

This starts backend + web + Electron together and opens **BioTrack - Healthcare Platform** as a desktop window using the same web UI theme and branding assets.

Build Windows files:

```bash
npm run desktop:icon
npm run desktop:build:win
```

Outputs:
- `.ico`: `desktop/assets/icon.ico`
- `.exe`: `dist-desktop/BioTrack-win32-x64/BioTrack.exe`

Notes:
- This build is a portable Windows app folder (not an installer).
- The desktop app still expects the web app at `http://127.0.0.1:3001` unless `ELECTRON_START_URL` is set.

Build macOS files:

```bash
npm run desktop:icon:mac
npm run desktop:build:mac
```

Outputs:
- `.icns`: `desktop/assets/icon.icns`
- `.app`: `dist-desktop/BioTrack-darwin-<arch>/BioTrack.app`

Build installer (auto-detect host platform):

```bash
npm run desktop:installer
```

Explicit installer target:

```bash
npm run desktop:installer:mac
npm run desktop:installer:win
```

Installer outputs:
- macOS: `dist-installer/BioTrack-<version>-mac-<arch>.dmg`
- Windows: `dist-installer/BioTrack-Setup-<version>-x64.exe`

## Mobile Run (Optional)

From repo root:

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Use your LAN IP instead of `10.0.2.2` when testing on a physical Android device.

## Dev Container Full Startup Guide

For detailed one-click Docker/Dev Container startup of MongoDB + backend + web + mobile behavior:
- `README-DEVCONTAINER-STARTUP.md`

## Core Auth and Onboarding Rules

- Patient can self-register from `/register`.
- Provider (barangay/clinic) cannot self-register.
- Admin must create provider accounts from `/admin/users`.
- Provider lifecycle status is `pending`, `verified`, or `active`.
- Only `active` providers can:
  - log in as provider
  - appear in patient health center dropdown
  - use BioTrack provider services
- Admin provider creation triggers provider onboarding email notification when SMTP is configured.

## Testing Guides

- Web run + role QA: `README-TESTING-WEB.md`
- Backend auth/session/API checks: `README-AUTH.md`
- Blockchain/integrity checks: `README-TESTING-BLOCKCHAIN.md`
- Mobile testing: `README-TESTING-MOBILE.md`

## Documentation Hub

- Main index: `docs/README.md`
- Threat model: `docs/THREAT_MODEL.md`
- Security documentation: `docs/SECURITY.md`
- API documentation: `docs/API_REFERENCE.md`
- Deployment guide: `docs/DEPLOYMENT.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Maintenance notes: `docs/MAINTENANCE.md`
