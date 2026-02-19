# Security Documentation

This document summarizes implemented security controls in the current BioTrack backend and where they are enforced.

## 1. Authentication and Session Security

- Password hashing (`bcrypt`)
  - `backend/src/services/authService.js`
- Generic login errors
  - `backend/src/controllers/patientAuthController.js`
  - `backend/src/controllers/adminController.js`
  - `backend/src/controllers/healthCenterController.js`
- Login and MFA rate limiting
  - `backend/src/middleware/rateLimit.js`
  - Applied in `backend/src/routes/patientRoutes.js`, `backend/src/routes/adminRoutes.js`, `backend/src/routes/healthCenterRoutes.js`
- MFA for patient login
  - `backend/src/controllers/patientAuthController.js`
  - Config in `backend/src/config/env.js` (`PATIENT_LOGIN_MFA_REQUIRED`)
- JWT validation and type checks
  - `backend/src/services/authService.js`
  - `backend/src/middleware/auth.js`
- Session expiry and revocation checks
  - `backend/src/controllers/sessionController.js`
  - `backend/src/middleware/auth.js`
- Logout invalidates active access
  - `backend/src/controllers/authController.js`
  - `backend/src/services/tokenRevocation.service.js`

## 2. Input Validation and Request Protection

- Schema validation (`zod`)
  - `backend/src/validation/authSchemas.js`
  - `backend/src/validation/apiSchemas.js`
  - `backend/src/middleware/validate.js`
- NoSQL injection sanitization
  - `backend/src/middleware/noSqlSanitize.js`
- CSRF protection for browser-like state-changing requests
  - `backend/src/middleware/csrf.js`
  - Mounted in `backend/src/index.js`
- HTTP hardening middleware
  - `helmet` and `hpp` in `backend/src/index.js`

## 3. Authorization and Governance

- Role-based endpoint protection
  - `backend/src/middleware/auth.js` (`requireRoles`, `requirePatientSelf`)
- Admin capability-based RBAC policy
  - `backend/src/middleware/rbac.js`
  - Enforced in `backend/src/routes/adminRoutes.js`
- Governance settings persistence
  - `backend/src/models/AdminConfig.js`
  - `backend/src/controllers/adminController.js`

## 4. Database and Data Protection

- MongoDB connection hardening + TLS controls
  - `backend/src/config/db.js`
  - `backend/src/config/env.js` (`MONGODB_REQUIRE_TLS`, `MONGODB_TLS_ENABLED`)
- Strong secret enforcement option
  - `backend/src/config/env.js` (`ENFORCE_STRONG_SECRETS`, `assertRequiredEnv`)
- Sensitive patient record payload encryption at rest (application layer)
  - `backend/src/services/recordDataEncryption.service.js`
  - `backend/src/controllers/patientRecordController.js`
- Encrypted backup artifact generation
  - `backend/src/services/databaseBackup.service.js`
  - Triggered by `backend/src/controllers/adminController.js`

## 5. Logging and Monitoring

- Central audit log writer
  - `backend/src/services/auditService.js`
- Audit log model and indexes
  - `backend/src/models/AuditLog.js`
- Security/system monitoring endpoints
  - `backend/src/controllers/adminController.js`
  - Routes in `backend/src/routes/adminRoutes.js`

## 6. Current Scope Notes

- SQL parameterized-query control: Not applicable in current stack (MongoDB/Mongoose).
- File upload validation: Not applicable (no upload route/middleware currently present).
- Data-at-rest encryption is currently applied to patient record payloads, not every collection field.
- Backup schedule metadata exists, but backup execution is currently triggered by endpoint call (not cron-scheduled in code).

