# BioTrack Mobile Testing Guide

This guide covers testing for the Flutter mobile app in this repository:
- onboarding/auth screens
- patient signup/login using backend auth endpoints
- live vital scan (camera + flash PPG)
- motion and fall indicators (accelerometer + gyroscope)

## 1. Prerequisites

- Flutter SDK installed and working (`flutter doctor` clean enough to run)
- Android device or emulator
- Backend running on port `3000`
- Device and backend machine on the same network for physical-device testing

## 2. Start Backend

From repo root:

```bash
npm install
npm run dev:backend
```

Expected:

```text
Server running at http://localhost:3000
```

Backend env note:
- Create `backend/.env` from `backend/env.example` before starting the backend.
- `OPENROUTER_API_KEY` must be non-empty (use `dev-placeholder` for local testing).
- For full env setup details, see `README-ENV.md`.

## 3. Run Mobile App

From repo root:

```bash
flutter pub get
```

Use one run command based on target:

- Android emulator:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

- Physical Android phone:

```bash
flutter run --dart-define=API_BASE_URL=http://<YOUR_PC_LAN_IP>:3000
```

Example:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.12:3000
```

## 4. Current Mobile Pages (Routes)

- `/` -> Onboarding
- `/auth` -> Auth choice
- `/login` -> Patient login
- `/signup` -> Patient signup
- `/health-details` -> Health details
- `/home` -> Home tab
- `/scan` -> Scan tab
- `/scan/live` -> Live Vital Scan
- `/ai-insights` -> AI Insights tab
- `/records` -> Records tab
- `/profile` -> Profile tab

## 5. Auth Test Flow

Mobile currently calls these backend endpoints:
- `GET /api/healthcenters` (signup dropdown)
- `POST /api/patients/register` (signup submit)
- `POST /api/patients/login` (login submit)

Run this flow:

1. Open app -> `Create Patient Account`.
2. Confirm health center list loads.
3. Fill required fields and submit.
4. Confirm success snackbar and redirect to login.
5. Log in with created account.
6. Confirm app navigates to `/home`.

Expected:
- Failed API calls show readable error messages from backend.
- Successful login stores local session in shared preferences.

## 6. Live Vital Scan Test Flow

Open: Home -> `Continue` -> Scan page -> `Start Scan`.

When permission prompts appear, allow:
- Camera
- Motion / Sensors
- Notifications

During scan:

1. Cover the back camera lens and flash fully with one fingertip.
2. Keep steady pressure (not too hard).
3. Keep phone still for full scan duration (about 25 seconds).
4. Watch metric cards.

Expected progression:

- `Finger Cover` -> `Detected`
- `Finger Confidence` usually rises above `56%` (finger detection threshold)
- `Pulse Confidence` increases after several seconds
- `Heart Rate` appears once signal is stable enough
- `Signal State` changes from `Collecting stable pulse` to:
  - `Low confidence pulse`, then
  - `Reliable pulse` (best case)

## 7. Why BPM Can Stay "-- bpm"

Even with red preview and finger detected, BPM can remain blank if pulse quality is low.

Current logic requires:
- enough samples collected (`>= 45` samples)
- minimum pulse confidence (`>= 18%`) before estimator returns BPM
- UI only keeps BPM when confidence is not too low

Common causes:
- slight hand motion or phone vibration
- weak blood perfusion (cold finger)
- fingertip pressure too light or too hard
- flash/lens not fully covered together

Quick fixes:

1. Rest elbow/phone on a table.
2. Warm finger first, then retry.
3. Try index finger, then thumb.
4. Ensure flashlight is on and lens is fully covered.
5. Retest with minimal movement for full 25 seconds.

## 8. Motion/Fall Indicator Checks

On `Live Vital Scan`:

- `Activity` changes with accelerometer movement.
- `Gyro` value increases when rotating the phone.
- `Fall Status` may show possible fall after high-impact then low-motion pattern.

Basic test:

1. While scanning, rotate phone slowly -> gyro should increase from near zero.
2. Shake lightly -> activity should rise from `Low`.
3. Keep device still -> activity returns toward `Low`.

## 9. Regression Commands

Before merging mobile changes:

```bash
flutter analyze
flutter test
```

Optional (if integration tests are configured for your device):

```bash
flutter test integration_test
```

## 10. Known Current Issues

- Some smaller screens can show layout overflow in `Live Vital Scan` near the bottom controls.
- No auto-login restore yet on app start; login state is saved but not yet used for boot-time redirect.
