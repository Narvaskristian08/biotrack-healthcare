# BioTrack Dev Container Startup Guide (Full System)

This guide is the detailed runbook for starting the BioTrack stack in Docker Dev Containers.

It covers:
- backend API
- web app
- MongoDB
- mobile startup behavior

## 1) What "entire system" means in Dev Container

When this repository runs in Dev Container mode, the operational stack is:

- `mongo` service (Docker Compose service)
- `app` service (your dev workspace container)
- backend process (`npm run dev:backend`) inside `app`
- web process (`npm --workspace web run dev -- --hostname 0.0.0.0 --port 3001 --webpack`) inside `app`

Mobile is handled separately:
- it auto-starts only when an Android/iOS device is detected
- if no device is detected, it is intentionally skipped and logged

## 2) Prerequisites (Local Mac)

- Docker Desktop installed and running
- VS Code extension: `Dev Containers` (`ms-vscode-remote.remote-containers`)
- Repo opened in VS Code

## 3) One-Time First Startup

1. Open Command Palette in VS Code.
2. Run: `Dev Containers: Reopen in Container`.
3. Wait for the first build/setup to finish.

The first setup can take several minutes because the container installs:
- Node dependencies (`npm ci`)
- Flutter dependencies (`flutter pub get`)
- local env files for backend/web if missing

## 4) Daily Startup (Inside Dev Container Terminal)

Usually this is enough:

```bash
bash .devcontainer/scripts/post-start.sh
```

If you just rebuilt or dependencies changed, run:

```bash
bash .devcontainer/scripts/post-create.sh
bash .devcontainer/scripts/post-start.sh
```

## 5) Service URLs

- Backend base: `http://127.0.0.1:3000`
- Backend API root: `http://127.0.0.1:3000/api`
- Web app: `http://127.0.0.1:3001`
- MongoDB: `127.0.0.1:27017`

## 6) Health Check Commands

Run from the Dev Container terminal:

```bash
curl -sS http://127.0.0.1:3000/
curl -I http://127.0.0.1:3001
```

Expected:
- backend response contains `BioTrack Backend Running`
- web returns `HTTP/1.1 200 OK` (or occasionally a route-specific non-200 on direct HEAD requests)

## 7) Runtime State, Logs, and PIDs

All runtime artifacts are stored at:
- `.devcontainer/.runtime/`

Important files:
- PID files: `.devcontainer/.runtime/pids/backend.pid`, `.devcontainer/.runtime/pids/web.pid`
- Logs: `.devcontainer/.runtime/logs/backend.log`, `.devcontainer/.runtime/logs/web.log`, `.devcontainer/.runtime/logs/mobile.log`

Useful commands:

```bash
ls .devcontainer/.runtime/pids
tail -n 50 .devcontainer/.runtime/logs/backend.log
tail -n 50 .devcontainer/.runtime/logs/web.log
tail -n 50 .devcontainer/.runtime/logs/mobile.log
```

Live tail:

```bash
tail -f .devcontainer/.runtime/logs/backend.log
tail -f .devcontainer/.runtime/logs/web.log
```

## 8) Mobile Startup Rules

Autostart script:

```bash
bash .devcontainer/scripts/start-mobile.sh
```

Current behavior:
- starts mobile only for Android/iOS targets
- if no Android/iOS device is present, it logs:
  - `No Android/iOS device detected. Skipping mobile autostart.`

You can control behavior with env vars:
- `BIOTRACK_AUTOSTART_MOBILE=false`
- `MOBILE_DEVICE_ID=<flutter-device-id>`
- `MOBILE_API_BASE_URL=http://127.0.0.1:3000`

## 9) Common Recovery Steps

If backend/web are not responding:

```bash
bash .devcontainer/scripts/post-start.sh
```

If web shows module resolution errors or stale dependency behavior:

```bash
bash .devcontainer/scripts/post-create.sh
bash .devcontainer/scripts/post-start.sh
```

If logs show port conflicts, restart the Dev Container from VS Code:
- `Dev Containers: Rebuild Container`

## 10) Stop and Restart

Inside container:
- stop processes by ending/restarting the Dev Container session

From host shell (optional advanced):

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
docker compose -f .devcontainer/docker-compose.yml down
```

## 11) Quick Command Set (Copy/Paste)

```bash
# full setup + start
bash .devcontainer/scripts/post-create.sh
bash .devcontainer/scripts/post-start.sh

# verify
curl -sS http://127.0.0.1:3000/
curl -I http://127.0.0.1:3001
ls .devcontainer/.runtime/pids
tail -n 30 .devcontainer/.runtime/logs/backend.log
tail -n 30 .devcontainer/.runtime/logs/web.log
tail -n 30 .devcontainer/.runtime/logs/mobile.log
```
