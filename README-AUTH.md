# Backend Auth, Session, and Role Testing Guide

This guide documents the current backend authentication model and how to test each role with API calls.

## 1. API Base URL

- Local backend base: `http://127.0.0.1:3000/api`

## 2. Auth Model Summary

BioTrack uses three auth flows:

1. Admin auth
- token type: `admin`
- issued by `POST /api/admin/login` or `POST /api/admin/register`
- used for admin endpoints

2. Provider auth (health center/barangay)
- step 1 token type: `healthcenter` from `POST /api/healthcenters/login`
- step 2 session token type: `session` from `POST /api/sessions/start`
- the `session` token is used for provider-protected patient/records endpoints

3. Patient auth
- token type: `patient`
- issued by `POST /api/patients/login`
- used for patient self access endpoints

## 3. Critical Lifecycle Rules

- Provider self-registration is blocked.
- Admin must create providers.
- Provider status lifecycle: `pending`, `verified`, `active`.
- Provider login is only allowed when status is `active`.
- Provider session can expire due to inactivity before absolute token expiry.
- Patient registration to a provider is only allowed when provider status is `active`.
- Patient login requires account verification status `verified`.

## 4. Backend Run Setup

For full environment setup across backend/web/mobile, see `README-ENV.md`.

Create `backend/.env` with at least:

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

Run backend from repo root:

```bash
npm run dev:backend
```

Health check:

```bash
curl http://127.0.0.1:3000/
```

## 5. Role-by-Role API Testing

### 5.1 Admin Flow

### A. Register or login admin

```bash
curl -X POST http://127.0.0.1:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"TempPass!123\"}"
```

or

```bash
curl -X POST http://127.0.0.1:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"TempPass!123\"}"
```

Save `accessToken` as `ADMIN_TOKEN`.

### B. Create provider (barangay unit)

```bash
curl -X POST http://127.0.0.1:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{
    \"role\":\"provider\",
    \"email\":\"provider@example.com\",
    \"password\":\"TempPass!123\",
    \"status\":\"pending\",
    \"barangayName\":\"Longos Barangay\",
    \"cityMunicipality\":\"San Fabian\",
    \"healthCenterName\":\"Longos Health Center\",
    \"officialContactInfo\":\"09084538768\",
    \"latitude\":16.1554,
    \"longitude\":120.4128,
    \"assignedHealthcareProviders\":[{\"name\":\"Nurse 1\"}]
  }"
```

Expected:
- `201`
- response includes `user`
- response includes `notification` with email delivery result

### C. Activate provider

```bash
curl -X POST http://127.0.0.1:3000/api/admin/providers/PROVIDER_ID/credential-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{\"status\":\"active\"}"
```

Expected:
- provider status becomes `active`

### 5.2 Provider Flow

### A. Login provider

```bash
curl -X POST http://127.0.0.1:3000/api/healthcenters/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"provider@example.com\",\"password\":\"TempPass!123\"}"
```

Expected:
- provider status must be `active`
- response includes `accessToken` (healthcenter token)

### B. Start provider session

```bash
curl -X POST http://127.0.0.1:3000/api/sessions/start \
  -H "Authorization: Bearer HEALTHCENTER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Save `sessionToken` as `PROVIDER_SESSION_TOKEN`.

### C. Access provider-protected resources

```bash
curl http://127.0.0.1:3000/api/patients \
  -H "Authorization: Bearer PROVIDER_SESSION_TOKEN"
```

Expected:
- `200` when session valid and provider active

Idle timeout note:
- If the session is inactive beyond `SESSION_IDLE_TIMEOUT`, protected calls return `401` with `Session expired due to inactivity`.

### 5.3 Patient Flow

### A. Public registration

```bash
curl -X POST http://127.0.0.1:3000/api/patients/register \
  -H "Content-Type: application/json" \
  -d "{
    \"healthCenterId\":\"ACTIVE_PROVIDER_ID\",
    \"lastName\":\"Dela Cruz\",
    \"firstName\":\"Juan\",
    \"middleInitial\":\"S\",
    \"email\":\"patient@example.com\",
    \"password\":\"TempPass!123\",
    \"address\":\"San Fabian Pangasinan\",
    \"contactNumber\":\"09084538768\"
  }"
```

Expected:
- provider must be `active`
- response returns `patient.id`
- verification status starts as `pending`

### B. Send verification code

```bash
curl -X POST http://127.0.0.1:3000/api/patients/verification/send-code \
  -H "Content-Type: application/json" \
  -d "{\"patientId\":\"PATIENT_ID\",\"method\":\"email\"}"
```

### C. Verify code

```bash
curl -X POST http://127.0.0.1:3000/api/patients/verification/verify-code \
  -H "Content-Type: application/json" \
  -d "{\"patientId\":\"PATIENT_ID\",\"method\":\"email\",\"code\":\"123456\"}"
```

### D. Patient login

```bash
curl -X POST http://127.0.0.1:3000/api/patients/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"patient@example.com\",\"password\":\"TempPass!123\"}"
```

Expected:
- login succeeds only if patient is `active`, verified, and health center is `active`
- response returns MFA challenge payload (`mfaRequired`, `patientId`, `challengeId`)

### E. Verify patient MFA code

```bash
curl -X POST http://127.0.0.1:3000/api/patients/login/verify-mfa \
  -H "Content-Type: application/json" \
  -d "{\"patientId\":\"PATIENT_ID\",\"challengeId\":\"CHALLENGE_ID\",\"code\":\"123456\"}"
```

Expected:
- valid challenge + code returns patient `accessToken`

## 6. Public Endpoint Checks

List active providers for patient registration dropdown:

```bash
curl http://127.0.0.1:3000/api/healthcenters
```

Expected:
- only providers with status `active` are returned

## 7. Negative Test Matrix

- provider login while status `pending` or `verified`:
  - expected `403`
- patient registration with non-active provider:
  - expected `403`
- patient login without verification:
  - expected `403` with verification guidance
- patient trying to access another patient id:
  - expected `403`
- wrong role token on protected endpoint:
  - expected `403` or `401`
- idle provider session on protected endpoint:
  - expected `401` with `Session expired due to inactivity`

## 8. Email Notification Behavior

When admin creates a provider through:
- `POST /api/admin/users` with `role: "provider"`, or
- `POST /api/admin/healthcenters`

The backend attempts onboarding email delivery and returns:
- `notification.attempted`
- `notification.delivered`
- `notification.channel`
- `notification.recipientMasked`
- `notification.message`

If SMTP is not configured in development, notification may fall back to console preview/logging.
