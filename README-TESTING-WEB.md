# BioTrack Web Testing Guide

This guide provides a full manual QA flow for the BioTrack Web Platform.

It covers:
- environment setup
- role-based testing (Patient, Healthcare Provider, Admin)
- RBAC negative tests (access restrictions)
- blockchain verification checks
- data governance and system monitoring checks
- test sign-off checklist

## 1. Scope

This web testing guide validates:
- authentication and role-based routing
- patient monitoring and records workflows
- blockchain integrity visibility and verification endpoints
- admin governance capabilities
- restrictions around immutable blockchain/medical records

## 2. Prerequisites

- Node.js 18+ (Node 20+ recommended)
- MongoDB running (local or remote)
- Dependencies installed at repo root:

```bash
npm install
```

- Backend `.env` configured (minimum):
  - `MONGODB_URI`
  - `ADMIN_JWT_SECRET`
  - `HEALTHCENTER_JWT_SECRET`
  - `SESSION_JWT_SECRET`
  - `OPENROUTER_API_KEY`

Optional blockchain verification mode:
- `BLOCKCHAIN_ENABLED=true`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

## 3. Start Services

From repo root, run in separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:web
```

Default URLs:
- Backend: `http://localhost:3000`
- Web: `http://localhost:3001` (or next available port shown by Next.js)

## 4. Test Accounts and Bootstrapping

Use Web Register/Login pages:
- `/register`
- `/login`

Recommended test accounts:
- Patient account
- Provider account (health center)
- Admin account

Important provider credential behavior:
- Providers created by Admin can be marked `pending`, `approved`, or `rejected`
- Provider login should be blocked unless credential status is `approved`

## 5. Smoke Test Matrix

Run this first before deep testing.

1. Login as Patient.
2. Confirm patient routes load and non-patient routes are blocked.
3. Login as Provider.
4. Confirm provider routes load and patient-only routes are blocked.
5. Login as Admin.
6. Confirm admin routes load and provider/patient management views are role-appropriate.

Expected:
- no blank pages
- no redirect loops
- unauthorized routes redirect safely

## 6. Patient Role Test Cases

Role intent: personal monitoring and own-record access.

### 6.1 Dashboard and Monitoring

Routes:
- `/`
- `/health-monitoring`
- `/vitals-history`
- `/ai-health-advisory`

Checks:
- patient sees own trend/summary/alerts only
- charts render without runtime errors
- empty state appears if no data exists

### 6.2 Medical History and Records

Routes:
- `/medical-records`
- `/blockchain`
- `/blockchain-verification`

Checks:
- records list loads
- verify actions call integrity endpoint successfully
- hash, tx id, block number, timestamp fields render when present
- record export/download actions work

### 6.3 Profile Management

Route:
- `/profile-settings`

Checks:
- patient profile loads
- allowed fields update successfully
- login history list loads

### 6.4 Patient Reports

Route:
- `/reports-downloads`

Checks:
- CSV/JSON/TXT exports download
- generated file contains only patient-scoped data

### 6.5 Patient Restrictions (Negative Tests)

Attempt:
- access `/patients`, `/users`, `/admin-dashboard`, `/admin/users`
- manually call another patient id endpoint (if testing API via Postman/curl)

Expected:
- UI redirect or access denied
- backend returns `403` for cross-patient resource access

## 7. Healthcare Provider Role Test Cases

Role intent: assigned patient monitoring and clinical oversight.

### 7.1 Provider Core Views

Routes:
- `/`
- `/provider-dashboard`
- `/patients`
- `/patients/[id]`
- `/users`
- `/users/[id]`
- `/records`
- `/analytics`
- `/provider-reports`

Checks:
- assigned patients list renders
- risk indicators and alert counts render
- latest vitals summary renders
- patient detail shows trend, AI summary, alert list, record verification controls

### 7.2 Real-Time Monitoring and Risk Flags

Checks:
- heart-rate trend chart loads
- risk-level badges load from AI summary response
- fall-related flags/alerts appear when data exists

### 7.3 Verified Records Access

Checks:
- provider can open records for assigned patients
- provider can run verify action on records
- tamper/anchor mismatch statuses are visible if returned

### 7.4 Report Generation

Checks:
- single-patient summary export works
- batch CSV export works
- export data columns are complete and readable

### 7.5 Provider Restrictions (Negative Tests)

Attempt:
- access admin routes: `/admin-dashboard`, `/admin/users`, `/admin/logs`
- attempt modifying blockchain hash fields (no UI operation should exist)
- attempt editing AI output directly (no UI operation should exist)

Expected:
- route guard blocks admin routes
- no mutation controls for immutable blockchain data
- AI outputs remain read-only

## 8. Admin Role Test Cases

Role intent: system governance and access control.

### 8.1 Admin Dashboard

Route:
- `/admin-dashboard`

Checks:
- overview cards load:
  - user counts
  - active sessions
  - failed events
  - blockchain proof counts
- snapshot export works

### 8.2 User Management

Route:
- `/admin/users`

Checks:
- list users (patient/provider/admin)
- create user by role:
  - provider
  - patient
  - admin
- activate/deactivate users
- approve/reject provider credentials

Credential approval validation:
1. Set provider credential to `rejected` or `pending`
2. attempt provider login
3. expect login blocked
4. set credential back to `approved`
5. login should succeed

### 8.3 RBAC Policies

Route:
- `/admin/ai-configuration` (RBAC policy editor)

Checks:
- policy toggles load from backend
- saving policy changes succeeds
- refresh preserves updated values

### 8.4 System Logs and Monitoring

Route:
- `/admin/logs`

Checks:
- log stream loads
- search and outcome filters work
- suspicious count updates
- export works

### 8.5 Blockchain Supervision

Route:
- `/admin/blockchain-management`

Checks:
- proof/failed counters load
- recent blockchain proof logs render
- export audit works

### 8.6 Data Governance and Backup

Route:
- `/admin/backup-recovery`

Checks:
- encryption/privacy settings load
- performance thresholds editable/savable
- backup marker action updates timestamp
- restore marker action updates timestamp

### 8.7 Admin Restrictions (Negative Tests)

Verify there is no operation that:
- changes historical blockchain hashes
- rewrites immutable medical records

Expected:
- admin can supervise/audit but cannot mutate immutable chain history or immutable medical entries

## 9. RBAC Route Guard Validation

Validate route access by role:

- Patient allowed:
  - `/`
  - `/health-monitoring`
  - `/medical-records`
  - `/vitals-history`
  - `/ai-health-advisory`
  - `/reports-downloads`
  - `/profile-settings`
  - `/blockchain`
  - `/blockchain-verification`

- Provider allowed:
  - `/`
  - `/provider-dashboard`
  - `/patients`, `/patients/[id]`
  - `/users`, `/users/[id]`
  - `/records`
  - `/analytics`
  - `/provider-reports`
  - `/blockchain`

- Admin allowed:
  - `/admin-dashboard`
  - `/admin/users`
  - `/admin/logs`
  - `/admin/ai-configuration`
  - `/admin/blockchain-management`
  - `/admin/backup-recovery`

Negative route tests:
- each role attempts one route from another role’s protected set
- expect redirect or blocked access

## 10. API-Level Spot Checks (Optional but Recommended)

Use Postman/curl with role token in `Authorization: Bearer <token>`.

Admin:
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/rbac`
- `GET /api/admin/logs`
- `GET /api/admin/blockchain/overview`

Provider:
- `GET /api/patients`
- `GET /api/patients/:id`
- `GET /api/patients/:id/records`
- `GET /api/ai/summary?patientId=:id`
- `GET /api/ai/trend-insight?patientId=:id`

Patient:
- `GET /api/patients/:id` (self only)
- `PATCH /api/patients/:id` (self only)
- `GET /api/patients/:id/login-history` (self only)
- `GET /api/patients/:id/records`
- `GET /api/patients/:id/records/:recordId/verify`

Expected:
- role-appropriate endpoints return `200`
- disallowed calls return `403`

## 11. Build and Static Validation

Run before QA sign-off:

```bash
npm --workspace web exec tsc -- --noEmit
```

```bash
npm --workspace web run build
```

Expected:
- no TypeScript errors
- successful Next.js production build

## 12. Final QA Sign-Off Checklist

Mark all as pass/fail:

- Auth works for Patient, Provider, Admin
- Role-based route guarding works
- Patient pages function and enforce self-only data access
- Provider pages function and enforce assigned-patient scope
- Admin pages function for governance, logs, RBAC, and supervision
- Provider credential approval flow works end-to-end
- Blockchain verification views load and verify actions run
- Report exports work for patient/provider/admin contexts
- No route exposes unauthorized data
- No UI/API flow can modify immutable blockchain hashes or immutable medical records

## 13. Troubleshooting

- `401 Unauthorized`
  - session expired or invalid token; login again
- `403 Forbidden`
  - RBAC restriction is expected for wrong-role endpoint
- empty charts/lists
  - no source data exists yet; seed test records first
- provider login blocked
  - provider credential status may be `pending` or `rejected`
- web build warning about lockfiles
  - informational; can be cleaned by standardizing lockfile strategy
