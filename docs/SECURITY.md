# Security Checklist (Category 1, 2, 3)

This document tracks the Category 1/2/3 security checklist with code evidence and short verification notes.

## Category 1: Authentication

| Check | Item | Where in code | Testing summary |
|---|---|---|---|
| [x] | Strong password hashing (`bcrypt`) | `backend/src/services/authService.js:11`, `backend/src/services/authService.js:15`, `backend/src/controllers/patientAuthController.js:191`, `backend/src/controllers/adminController.js:110` | Register/login flows use hash + compare path; no plaintext comparison. |
| [x] | Secure sessions with expiry | `backend/src/models/Session.js:9`, `backend/src/controllers/sessionController.js:23`, `backend/src/middleware/auth.js:219` | Session start returns `expiresAt`; middleware blocks expired/revoked sessions. |
| [x] | Generic login errors | `backend/src/controllers/patientAuthController.js:17`, `backend/src/controllers/adminController.js:18`, `backend/src/controllers/healthCenterController.js:7` | Invalid login paths return the same generic credential error to reduce enumeration leakage. |
| [x] | Rate limiting for logins | `backend/src/middleware/rateLimit.js:4`, `backend/src/routes/patientRoutes.js:44`, `backend/src/routes/adminRoutes.js:43`, `backend/src/routes/healthCenterRoutes.js:20` | Login endpoints are throttled with explicit 429 response policy. |
| [x] | MFA available/enforced | `backend/src/config/env.js:100`, `backend/src/controllers/patientAuthController.js:456`, `backend/src/routes/patientRoutes.js:45` | Patient login issues MFA challenge when enabled; `/login/verify-mfa` completes auth. |
| [x] | Validated tokens (JWT) | `backend/src/services/authService.js:69`, `backend/src/services/authService.js:77`, `backend/src/middleware/auth.js:126` | Invalid/expired/wrong token-type requests are rejected with 401. |
| [x] | Strong password policy | `backend/src/utils/passwordPolicy.js:8`, `backend/src/utils/passwordPolicy.js:14`, `backend/src/controllers/patientAuthController.js:159`, `backend/src/controllers/adminController.js:102` | Weak passwords are rejected before account creation/update. |
| [x] | Logout invalidates session | `backend/src/controllers/authController.js:38`, `backend/src/controllers/authController.js:70`, `backend/src/services/tokenRevocation.service.js:13` | Logout revokes current token and session record; subsequent token reuse is denied. |
| [x] | OAuth/SSO or advanced auth | `backend/src/routes/authRoutes.js:15`, `backend/src/controllers/authController.js:81` | Google OAuth endpoint is implemented; returns safe config error if missing setup. |

## Category 2: Input Validation

| Check | Item | Where in code | Testing summary |
|---|---|---|---|
| [x] | All inputs validated server-side | `backend/src/middleware/validate.js:3`, `backend/src/routes/patientRoutes.js:47`, `backend/src/routes/adminRoutes.js:49`, `backend/src/routes/aiRoutes.js:9` | Body/query/params schemas are enforced and invalid requests return `VALIDATION_ERROR`. |
| N/A | Parameterized SQL queries | `backend/src/config/db.js:1` | Not applicable; stack uses MongoDB/Mongoose (no SQL query layer). |
| [x] | XSS protection (context-aware rejection) | `backend/src/middleware/xssInputGuard.js:34`, `backend/src/index.js:90` | Suspicious script/HTML payloads are rejected with `XSS_INPUT_REJECTED`. |
| [x] | File upload validation (type + size) | `backend/src/middleware/fileUpload.js:24`, `backend/src/middleware/fileUpload.js:29`, `backend/src/routes/patientRoutes.js:93` | Upload validation enforces MIME allowlist and max-byte limits before processing. |
| [x] | API schema validation | `backend/src/validation/authSchemas.js:1`, `backend/src/validation/apiSchemas.js:1`, `backend/src/middleware/validate.js:28` | Endpoint schemas are defined in Zod and applied at route level. |
| [x] | NoSQL injection protection | `backend/src/middleware/noSqlSanitize.js:1`, `backend/src/index.js:89` | Request body/query/params are sanitized against Mongo operator injection. |
| [x] | CSRF tokens enabled | `backend/src/middleware/csrf.js:24`, `backend/src/index.js:93`, `backend/src/routes/authRoutes.js:12` | Browser-like state-changing requests require matching CSRF cookie/header token. |

## Category 3: Data Protection and Governance

- [x] Secure credential storage (`.env` / vault-ready)
  Evidence: `.gitignore:10`, `backend/src/config/env.js:1`, `backend/src/config/env.js:156`
- [x] Role-based access control
  Evidence: `backend/src/middleware/auth.js:283`, `backend/src/middleware/rbac.js:42`, `backend/src/routes/adminRoutes.js:49`
- [x] Database encryption at rest (application layer)
  Evidence: `backend/src/services/recordDataEncryption.service.js:34`, `backend/src/controllers/patientRecordController.js:97`, `backend/src/services/healthTelemetryEncryption.service.js:34`, `backend/src/controllers/aiController.js:72`
- [x] Encrypted backups
  Evidence: `backend/src/services/databaseBackup.service.js:85`, `backend/src/services/databaseBackup.service.js:99`, `backend/src/controllers/adminController.js:871`
- [x] Audit logging enabled
  Evidence: `backend/src/services/auditService.js:3`, `backend/src/models/AuditLog.js:32`, `backend/src/routes/auditLogRoutes.js:10`
- [x] TLS database connections
  Evidence: `backend/src/config/db.js:32`, `backend/src/config/db.js:50`, `backend/src/config/env.js:64`
- [x] Database hardening
  Evidence: `backend/src/config/db.js:40`, `backend/src/config/db.js:61`, `backend/src/config/db.js:62`

## Notes

- Category 2 SQL parameterization remains intentionally N/A for this stack because persistence is MongoDB/Mongoose.
- Operational best practice remains to move production secrets to a dedicated secret manager/vault.
