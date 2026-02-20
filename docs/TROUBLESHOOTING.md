# Troubleshooting

## 1. Backend Fails on Startup

Symptoms:

- Process exits immediately.
- Error indicates missing env vars.

Checks:

- Ensure `backend/.env` exists.
- Set required values:
  - `MONGODB_URI`
  - `ADMIN_JWT_SECRET`
  - `HEALTHCENTER_JWT_SECRET`
  - `SESSION_JWT_SECRET`
  - `OPENROUTER_API_KEY` (non-empty)

Reference:

- `backend/src/config/env.js`
- `README-ENV.md`

## 2. CORS Blocked in Browser

Symptoms:

- Browser console shows CORS errors.

Fix:

- Set `CORS_ORIGIN` to include your web origin.
- Use consistent host naming (`127.0.0.1` vs `localhost`).

Reference:

- `backend/src/index.js`
- `README-TESTING-WEB.md`

## 3. Invalid CSRF Token

Symptoms:

- `403` with `CSRF_INVALID`.

Fix:

- Fetch token from `GET /api/auth/csrf-token`.
- Send token in configured header (`x-csrf-token` by default).
- Ensure cookie and header token values match.

Reference:

- `backend/src/middleware/csrf.js`

## 4. Provider Login Fails

Symptoms:

- Correct credentials but still rejected.

Fix:

- Provider status must be `active`.
- Use admin endpoint to update status:
  - `POST /api/admin/providers/:providerId/credential-status`

Reference:

- `backend/src/controllers/healthCenterController.js`

## 5. Patient Cannot Log In

Symptoms:

- Login fails or MFA challenge rejected.

Fix:

- Patient must be `verified`.
- Provider must be `active`.
- Complete MFA challenge quickly before expiry.
- Respect resend cooldown and attempt limits.

Reference:

- `backend/src/controllers/patientAuthController.js`

## 6. Rate-Limited Responses (`429`)

Symptoms:

- `Too many login attempts` or `Too many MFA verification attempts`.

Fix:

- Wait for limiter window.
- Reduce repeated retries during manual testing.
- Adjust limits only for controlled environments.

Reference:

- `backend/src/middleware/rateLimit.js`

## 7. Backups Not Running

Symptoms:

- Backup endpoint returns `BACKUP_DISABLED` or no file generated.

Fix:

- Ensure governance flag `backupEnabled` is true.
- Ensure backup output path exists or is writable.
- Ensure backup encryption key policy is satisfied in production.

Reference:

- `backend/src/controllers/adminController.js`
- `backend/src/services/databaseBackup.service.js`

## 8. Blockchain Verify/Anchor Issues

Symptoms:

- Missing tx IDs, verify failures, or strict-mode failures.

Fix:

- Validate blockchain env vars.
- Confirm contract addresses and ABI compatibility.
- Confirm writer authorization for backend wallet.
- Temporarily set strict mode off for diagnosis.

Reference:

- `README-TESTING-BLOCKCHAIN.md`
- `README-BLOCKCHAIN-RISK-MITIGATION.md`

## 9. Mobile App Cannot Reach Backend

Symptoms:

- Network error from Flutter app.

Fix:

- Emulator: use `http://10.0.2.2:3000`.
- Physical device: use host machine LAN IP.
- Confirm backend is running and firewall allows inbound traffic.

Reference:

- `README-TESTING-MOBILE.md`

## 10. Google OAuth Button Disabled or Missing

Symptoms:

- Google sign-in is unavailable on `/login`.

Fix:

- Set `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` in `web/.env.local`.
- Set `GOOGLE_OAUTH_CLIENT_ID` in `backend/.env`.
- Restart both backend and web dev servers.

Reference:

- `web/app/login/page.tsx`
- `backend/src/controllers/authController.js`

## 11. Upload Validation Fails

Symptoms:

- `415 UPLOAD_TYPE_INVALID` or `413 PAYLOAD_TOO_LARGE`.

Fix:

- Use one of allowed MIME types (`application/pdf`, `image/jpeg`, `image/png` by default).
- Keep payload size below `UPLOAD_MAX_BYTES`.
- Include optional `x-file-name` with safe characters only.

Reference:

- `backend/src/middleware/fileUpload.js`
- `docs/API_REFERENCE.md`
