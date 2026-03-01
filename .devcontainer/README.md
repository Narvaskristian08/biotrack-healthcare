# Devcontainer One-Click Startup

Detailed runbook:
- `README-DEVCONTAINER-STARTUP.md`

Opening this repo in Codespaces or VS Code Dev Containers does this automatically:

1. Builds a devcontainer with Node 20, Flutter SDK, and MongoDB service.
2. Installs dependencies (`npm ci`, `flutter pub get`) during `postCreate`.
3. Starts backend + web during `postStart`.
4. Attempts to start Flutter mobile automatically when an Android/iOS device is detected.

## Default Ports

- `3000`: backend API
- `3001`: Next.js web app
- `27017`: MongoDB

## Local Docker Desktop (Mac) Quick Start

1. Install Docker Desktop (Apple Silicon build) and launch it.
2. In VS Code, install extension `ms-vscode-remote.remote-containers`.
3. Open this repo and run `Dev Containers: Reopen in Container`.
4. Wait for first build/setup to complete.
5. Verify startup artifacts:

```bash
ls .devcontainer/.runtime/pids
tail -n 50 .devcontainer/.runtime/logs/backend.log
tail -n 50 .devcontainer/.runtime/logs/web.log
tail -n 50 .devcontainer/.runtime/logs/mobile.log
```

## Mobile Autostart Behavior

Codespaces cannot provide an Android/iOS emulator by default. Mobile autostart runs only when a real device is visible to `flutter devices`.

Useful environment overrides:

- `BIOTRACK_AUTOSTART_MOBILE=false` to disable mobile autostart
- `MOBILE_DEVICE_ID=<flutter-device-id>` to force a specific device
- `MOBILE_API_BASE_URL=http://127.0.0.1:3000` to override API endpoint used by `flutter run`

Manual mobile start:

```bash
bash .devcontainer/scripts/start-mobile.sh
```
