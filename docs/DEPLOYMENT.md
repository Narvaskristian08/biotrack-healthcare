# Deployment Guide

This guide covers practical deployment for the current monorepo (`backend` + `web`).

## 1. Prerequisites

- Node.js 20.9+ (required by Next.js web app)
- npm 9+
- MongoDB instance
- Linux or Windows server with process manager support

## 2. Required Environment Files

- Backend: `backend/.env`
- Web: `web/.env.local`

Use templates:

- `backend/env.example`
- `web/.env.example`

## 3. Backend Production Configuration

Minimum required:

- `MONGODB_URI`
- `ADMIN_JWT_SECRET`
- `HEALTHCENTER_JWT_SECRET`
- `SESSION_JWT_SECRET`
- `OPENROUTER_API_KEY` (must be non-empty)

Recommended production security settings:

- `NODE_ENV=production`
- `MONGODB_REQUIRE_TLS=true`
- `MONGODB_TLS_ENABLED=true`
- `ENFORCE_STRONG_SECRETS=true`
- `CSRF_COOKIE_SECURE=true`
- `XSS_INPUT_PROTECTION_ENABLED=true`
- `DATA_ENCRYPTION_ENABLED=true`
- `DATA_ENCRYPTION_KEY=<32-byte key>`
- `BACKUP_ENCRYPTION_KEY=<32-byte key>`
- `UPLOAD_MAX_BYTES=5242880`
- `UPLOAD_ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png`

## 4. Web Production Configuration

Required:

- `NEXT_PUBLIC_API_URL=https://<your-api-domain>/api`

Optional:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>` (if using map picker features)
- `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=<client-id>` (if using Google sign-in on `/login`)

## 5. Build and Start

From repo root:

```bash
npm install
npm --workspace web run build
npm run start:backend
npm run start:web
```

Default ports:

- Backend: `3000`
- Web: `3001` (or your runtime port config)

## 6. Reverse Proxy and TLS

Deploy behind a reverse proxy (Nginx/Caddy/Apache) and terminate HTTPS at the proxy.

Recommended:

- `https://app.example.com` -> web service
- `https://api.example.com` -> backend service

Ensure:

- CORS allows only trusted origins (`CORS_ORIGIN`)
- Cookies are secure in production (`CSRF_COOKIE_SECURE=true`)

## 7. Post-Deployment Smoke Checks

1. `GET /` on backend returns service response.
2. Open web login page and verify API connectivity.
3. Test admin login.
4. Test patient login + MFA verify.
5. Call one protected endpoint with token.
6. Trigger one backup run (`POST /api/admin/governance/backup`).

## 8. Deployment Notes

- Current codebase has no built-in cron scheduler for backups.
  - Backup runs are API-triggered.
  - Use external scheduler (cron, CI job, task scheduler) to call backup endpoint.
- Keep `.env` out of version control and rotate secrets regularly.
- For blockchain mode, deploy contracts first and set contract addresses before enabling writes.
- Keep `BLOCKCHAIN_ALLOW_MAINNET=false` until testnet validation is complete.
- For key rotation, prefer `BLOCKCHAIN_PRIVATE_KEYS` + `BLOCKCHAIN_ACTIVE_KEY_INDEX` over replacing a single key in-place.
