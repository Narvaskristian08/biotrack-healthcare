# BioTrack Healthcare Monorepo

This repository contains:
- `backend/`: Express + MongoDB API
- `web/`: Next.js web app

## Local Requirements

- Node.js 18+ (Node.js 20 recommended)
- npm 9+
- MongoDB running locally or remotely

## Install Dependencies

From repo root:

```bash
npm install
```

## Environment Setup

### 1) Backend env

Create `backend/.env` (copy from `backend/env.example`) and set at least:

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
- `OPENROUTER_API_KEY` is required by backend startup validation. Use a placeholder for local auth/routing tests if AI calls are not part of your run.
- SMTP is optional for startup, but required if you want real provider/patient email delivery.

### 2) Web env

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_optional
```

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is optional. It is only needed for the Admin Google Maps location picker on `/admin/users`.

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

