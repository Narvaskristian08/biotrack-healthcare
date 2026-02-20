# BioTrack Environment Setup Guide

This repository uses different environment inputs per app:

- Backend: `backend/.env` (required)
- Web: `web/.env.local` (required for web)
- Mobile (Flutter): no `.env` file; use `--dart-define` at runtime

## 1) Quick Setup Commands

Bash:

```bash
cp backend/env.example backend/.env
cp web/.env.example web/.env.local
```

PowerShell:

```powershell
Copy-Item backend/env.example backend/.env
Copy-Item web/.env.example web/.env.local
```

## 2) Backend Env (`backend/.env`)

Source template:
- `backend/env.example`

Minimum required to start backend:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://127.0.0.1:3001,http://localhost:3001
MONGODB_URI=mongodb://127.0.0.1:27017/biotrack
ADMIN_JWT_SECRET=change_me_admin_secret
HEALTHCENTER_JWT_SECRET=change_me_healthcenter_secret
SESSION_JWT_SECRET=change_me_session_secret
OPENROUTER_API_KEY=dev-placeholder
```

Notes:
- `OPENROUTER_API_KEY` must be non-empty due to startup validation.
- SMTP/Twilio/Blockchain vars are optional unless you are testing those flows.
- Security defaults added:
  - `PASSWORD_MIN_LENGTH=12`
  - `LOGIN_RATE_LIMIT_WINDOW_MS=900000`
  - `LOGIN_RATE_LIMIT_MAX=10`
  - `SESSION_IDLE_TIMEOUT=30m` (legacy fallback)
  - `PROVIDER_SESSION_IDLE_TIMEOUT=15m`
  - `PATIENT_SESSION_IDLE_TIMEOUT=30m`
  - `ADMIN_SESSION_IDLE_TIMEOUT=15m`
  - `SESSION_ACTIVITY_TOUCH_INTERVAL=60s`
  - `XSS_INPUT_PROTECTION_ENABLED=true`
  - `UPLOAD_MAX_BYTES=5242880`
  - `UPLOAD_ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png`
  - `CSRF_ENABLED=true`
  - `CSRF_COOKIE_NAME=biotrack_csrf`
  - `CSRF_HEADER_NAME=x-csrf-token`
  - `JWT_ISSUER=biotrack-healthcare`
  - `JWT_AUDIENCE=biotrack-app`
  - `MONGODB_REQUIRE_TLS=true` (set `false` only for local non-TLS MongoDB)
  - `ENFORCE_STRONG_SECRETS=false` (set `true` in production)

Database security settings (recommended for production):

```env
MONGODB_REQUIRE_TLS=true
MONGODB_TLS_ENABLED=true
ENFORCE_STRONG_SECRETS=true
DATA_ENCRYPTION_ENABLED=true
DATA_ENCRYPTION_KEY=<32-byte key>
BACKUP_ENCRYPTION_KEY=<32-byte key>
```

Notes:
- `DATA_ENCRYPTION_KEY` encrypts sensitive patient record payloads at rest.
- `BACKUP_ENCRYPTION_KEY` encrypts generated database backup files.
- Both keys accept: 64-char hex, base64-encoded 32-byte key, or 32-char UTF-8 string.

## 3) Web Env (`web/.env.local`)

Source template:
- `web/.env.example`

Minimum:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api
```

Optional:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=
```

Use this key only if testing the Admin map picker in `/admin/users`.
Set `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` to enable Google OAuth sign-in on `/login`.

## 4) Mobile Runtime Config (Flutter)

Mobile reads API base URL from Dart defines, not from `.env` files.

Android emulator:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Physical Android device:

```bash
flutter run --dart-define=API_BASE_URL=http://<YOUR_PC_LAN_IP>:3000
```

Default when omitted:
- `http://10.0.2.2:3000` (see `lib/core/config/app_config.dart`)

## 5) Safety

- Never commit real secrets to git.
- Use placeholders in local examples.
- Keep production keys in a secrets manager.
