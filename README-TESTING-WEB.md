# BioTrack Web Testing Guide (Fixed Port: 127.0.0.1:3001)

This guide is for running and testing the full web authentication and role flows against the local backend.

## 1. Target Local URLs

- Web: `http://127.0.0.1:3001`
- Backend API: `http://127.0.0.1:3000/api`

Use `127.0.0.1` consistently to avoid localhost/host mismatch issues.

## 2. Prerequisites

- Node.js 20.9+ (required for Next.js 16 in `web/`)
- MongoDB running
- Repo dependencies installed from root:

```bash
npm install
```

## 3. Environment Configuration

First-time setup:

```bash
cp backend/env.example backend/.env
cp web/.env.example web/.env.local
```

PowerShell:

```powershell
Copy-Item backend/env.example backend/.env
Copy-Item web/.env.example web/.env.local
```

For full details, see `README-ENV.md`.

### 3.1 Backend (`backend/.env`)

Minimum required:

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

Optional for real emails:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 3.2 Web (`web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_optional
```

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is optional and only used by the Admin Google Maps picker on `/admin/users`.

## 4. Start Services

Run in two terminals from repo root.

Terminal 1 (backend):

```bash
npm run dev:backend
```

Terminal 2 (web fixed to `127.0.0.1:3001`):

```bash
npm --workspace web run dev -- --hostname 127.0.0.1 --port 3001
```

## 5. Quick Smoke Test

Open:
- `http://127.0.0.1:3001/login`
- `http://127.0.0.1:3001/register`

Expected:
- pages load without infinite spinner
- no CORS/network errors in browser console

## 6. Onboarding Rules to Validate

- Provider (barangay/clinic) self-registration is blocked.
- Admin creates provider from `/admin/users`.
- Provider lifecycle statuses: `pending`, `verified`, `active`.
- Only `active` providers:
  - can log in
  - appear in patient Health Center dropdown
  - can access provider services
- Admin provider creation returns notification status and attempts onboarding email delivery.

## 7. Role-Based Test Flows

### 7.1 Admin Role Testing

1. Register/login admin:
- Open `http://127.0.0.1:3001/register` and select `Admin`, or use `/login` for existing admin.

2. Open `http://127.0.0.1:3001/admin/users`.

3. Create provider (Barangay Unit):
- Fill required fields:
  - email
  - password
  - barangay name
  - city/municipality
  - health center name
  - official contact info
  - latitude/longitude
- Set initial status (`pending`, `verified`, or `active`).

4. Validate provider email notification:
- After create, UI should show either:
  - onboarding email sent, or
  - account created but email notification not delivered (with reason)

5. Status transition checks:
- Set provider to `pending`, try provider login, expect blocked.
- Set provider to `verified`, try provider login, expect blocked.
- Set provider to `active`, provider login should succeed.

6. Validate admin pages:
- `/admin-dashboard`
- `/admin/users`
- `/admin/logs`
- `/admin/ai-configuration`
- `/admin/blockchain-management`
- `/admin/backup-recovery`

Expected:
- all admin pages load
- user management and status updates work

### 7.2 Provider Role Testing

Use provider account created by admin.

1. Login at `http://127.0.0.1:3001/login` with role `Provider`.

2. Validate allowed routes:
- `/`
- `/provider-dashboard`
- `/patients`
- `/patients/[id]`
- `/users`
- `/users/[id]`
- `/records`
- `/analytics`
- `/provider-reports`

3. Validate restrictions:
- Attempt `/admin/users` and `/admin/logs`.
- Expected: redirected/blocked by route guard.

4. Validate session behavior:
- Provider login should fail when provider status is not `active`.
- Provider login should succeed when status is `active`.

### 7.3 Patient Role Testing

1. Open `http://127.0.0.1:3001/register` and choose `Patient`.

2. Validate Health Center dropdown behavior:
- If no provider is `active`, dropdown should be empty.
- After admin activates a provider, dropdown should list it.

3. Complete patient registration:
- required fields include health center, names, email, password, address, contact number

4. Account verification flow:
- Send code via email or SMS
- verify code
- then login

5. Validate allowed routes:
- `/`
- `/health-monitoring`
- `/medical-records`
- `/vitals-history`
- `/ai-health-advisory`
- `/reports-downloads`
- `/profile-settings`
- `/blockchain`
- `/blockchain-verification`

6. Validate restrictions:
- Attempt `/patients`, `/users`, `/admin-dashboard`, `/admin/users`
- Expected: redirected/blocked

## 8. API Spot Checks (Optional)

Use tokens from login.

Admin:
- `GET /api/admin/overview`
- `GET /api/admin/users`

Provider:
- `GET /api/patients`

Patient:
- `GET /api/patients/:id` (self only)
- `GET /api/patients/:id/records` (self only)

Expected:
- allowed endpoints return `200`
- disallowed role access returns `403`

## 9. Build Validation

From repo root:

```bash
npm --workspace web run build
```

Expected:
- build succeeds

## 10. OWASP ZAP Baseline Scan (Unauthenticated)

Prerequisites:
- Docker installed
- Backend and web running (see section 4)

Run baseline scan against the web UI:

```bash
npm run zap:web
```

Run baseline scan against the API:

```bash
npm run zap:api
```

Reports are written to `docs/zap/` as HTML, JSON, and Markdown files.

Notes:
- Baseline scans are passive and mostly cover unauthenticated routes.
- For authenticated scanning, create a ZAP context/user or provide an OpenAPI spec and run an API scan.

## 11. End-to-End (Playwright)

Prerequisites:
- Backend + web running (section 4)
- MongoDB running
- If blockchain is not configured locally, set `BLOCKCHAIN_ENABLED=false` or `BLOCKCHAIN_STRICT_MODE=false` in `backend/.env` for test runs

Install test deps (from repo root):

```bash
npm install
npx playwright install
```

Run E2E tests:

```bash
npm --workspace web run test:e2e
```

Optional overrides:
- `E2E_BASE_URL` (default `http://127.0.0.1:3001`)
- `E2E_API_URL` (default `http://127.0.0.1:3000/api`)

Notes:
- Tests create admin/provider/patient records in MongoDB.
- MFA/verification steps rely on dev preview codes returned by the API (non-production mode).

## 12. Troubleshooting

- `/register` or `/login` keeps loading:
  - confirm backend is running on `127.0.0.1:3000`
  - confirm `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api`
  - restart web dev server after env change

- Patient Health Center dropdown empty:
  - at least one provider must exist with status `active`
  - confirm backend `GET /api/healthcenters` returns data

- Provider login blocked:
  - provider is not `active` yet

- Google Maps picker shows "Oops! Something went wrong":
  - verify valid Maps JavaScript API key
  - enable Maps JavaScript API and Places API
  - configure HTTP referrers for `127.0.0.1:3001`
