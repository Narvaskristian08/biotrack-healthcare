# API Documentation

Backend base URL:

- Local: `http://127.0.0.1:3000/api`

Auth header format:

- `Authorization: Bearer <token>`

## Authentication (`/api/auth`)

- `GET /csrf-token`
  - Returns CSRF token and header name.
- `POST /logout`
  - Revokes a valid bearer token (admin/healthcenter/session/patient).
- `POST /oauth/google`
  - Google sign-in for patient flow.

## Admin (`/api/admin`)

Public:

- `POST /register`
- `POST /login`

Protected (admin token required):

- `POST /healthcenters`
- `POST /barangays`
- `GET /overview`
- `GET /users`
- `POST /users`
- `PATCH /users/:userRole/:userId`
- `POST /providers/:providerId/credential-status`
- `POST /barangays/:providerId/status`
- `GET /rbac`
- `PATCH /rbac`
- `GET /logs`
- `GET /monitoring`
- `GET /blockchain/overview`
- `GET /governance`
- `PATCH /governance`
- `POST /governance/backup`
- `POST /governance/restore`

Notes:

- Many admin routes also require capability checks via policy (`canManageUsers`, `canManagePolicies`, etc.).

## Health Centers (`/api/healthcenters`)

- `GET /ping`
- `GET /`
- `POST /register`
  - Intentionally blocked (self-register disabled).
- `POST /login`

## Sessions (`/api/sessions`)

- `POST /start`
  - Requires healthcenter token.
  - Returns session token.
- `POST /logout`
  - Requires valid session auth token.

## Patients (`/api/patients`)

Public:

- `POST /register`
- `POST /verification/send-code`
- `POST /verification/verify-code`
- `POST /login`
- `POST /login/verify-mfa`

Protected:

- `GET /`
- `POST /`
- `GET /:id`
- `PATCH /:id`
- `GET /:id/login-history`
- `GET /:patientId/records`
- `POST /:patientId/records`
- `GET /:patientId/records/:recordId/verify`

Notes:

- Patient self-access enforcement is applied where relevant.
- Role restrictions apply per endpoint (`healthcenter`, `patient`, or both).

## Audit Logs (`/api/auditlogs`)

- `GET /`
  - Requires session auth.
  - Supports filtered query params.

## AI Endpoints (`/api/ai`)

- `POST /analyze`
- `POST /activity-insight`
- `POST /fall-insight`
- `GET /trend-insight`
- `GET /summary`
- `GET /alerts`

## Validation and Errors

- Request validation uses `zod` schemas:
  - `backend/src/validation/authSchemas.js`
  - `backend/src/validation/apiSchemas.js`
- Validation errors return:
  - `400` with `error.code = VALIDATION_ERROR`
- Common auth/authorization statuses:
  - `401` Unauthorized / invalid token
  - `403` Forbidden / role-policy blocked
  - `429` Rate limited
