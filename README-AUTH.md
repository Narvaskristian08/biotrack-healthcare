## Auth + Sessions (Shared Health Center Account) — Guide

For complete blockchain and integrity testing instructions, see:
- `README-TESTING-BLOCKCHAIN.md`

This project uses a **shared Health Center account** (one email/password for the clinic) and issues a **shared Session token** for the health center.

In this simplified mode:
- **HealthCenter login** is required (shared account)
- **Session token** is required for patient/record endpoints
- there is **no per-staff / per-device identity**

Optional (for readability in audit logs):
- `X-Barangay` (e.g. `San Fabian`)
- `X-Actor-Name` (e.g. `Nurse Ana`)

## Web Platform - Role-Based System

The BioTrack Web Platform acts as a centralized monitoring and management system for healthcare stakeholders.

It implements Role-Based Access Control (RBAC) to enforce:
- security
- data privacy
- proper permission management
- controlled access to sensitive medical records

### Core access model

- Every authenticated user is assigned a role.
- Permissions are granted to roles, not directly to users.
- Users can only view or modify records allowed by their assigned role.
- High-risk actions are logged for accountability and traceability.

### Typical roles and permissions

- `System Admin`
  - Manages platform configuration, user roles, and policy settings.
  - Has full administrative access, including audit and compliance views.
- `Health Center Admin`
  - Manages users and operations within a single health center.
  - Can view and manage patients and records for their own organization.
- `Clinician / Nurse`
  - Can create and update clinical records relevant to assigned patients.
  - Cannot change global role or platform configuration settings.
- `Viewer / Auditor`
  - Read-only access to approved records and reports.
  - No create, update, or delete privileges.

### Data protection controls

- Least privilege: default access is restricted until explicitly granted.
- Organization scoping: access is limited to the correct health center context.
- Session-based authentication with token validation.
- Audit logging for record access and modifications.

## PATIENT ROLE

Role: Personal Health Monitoring & Record Access

The Patient role on the web platform is for users who want a larger dashboard view compared to mobile.

### What Patients Can Do

- View Personal Health Dashboard
  - Real-time heart rate data
  - Activity history
  - Fall detection logs
  - AI-generated health insights
- View Medical History
  - Historical vital trends
  - AI advisory summaries
  - Downloadable health reports
- Verify Record Authenticity
  - Check blockchain verification status
  - View timestamp and record hash confirmation
- Manage Profile
  - Update personal details
  - Manage emergency contacts
  - View login history

### Restrictions

- Cannot access other patients' data.
- Cannot modify blockchain records.
- Cannot change system configurations.




### Environment setup

Create `.env` (copy from `env.example`) and set secrets + MongoDB URI:

```bash
cp env.example .env
```

Required:
- `MONGODB_URI`
- `HEALTHCENTER_JWT_SECRET`
- `SESSION_JWT_SECRET`
- `OPENROUTER_API_KEY`

Optional blockchain (set these when you want on-chain anchoring):
- `BLOCKCHAIN_ENABLED=true`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

Start server:

```bash
npm run dev
```

Base URL: `http://localhost:3000`

## MongoDB Compass guide (view data while testing)

Use MongoDB Compass to verify that your requests are writing to MongoDB (patients, records, sessions, audit logs).

### 0) Step-by-step: start MongoDB locally (mongod)

If you use **local MongoDB** (URI like `mongodb://127.0.0.1:27017/biotrack`), you must start the MongoDB server first.

#### Windows (MongoDB Community)

1. Install **MongoDB Community Server** (and optionally MongoDB Compass) using the MongoDB installer.
2. During install, keep **“Install MongoDB as a Service”** enabled (recommended).
3. Start the MongoDB service (run PowerShell as Administrator):

```powershell
net start MongoDB
```

4. Verify it’s running:

```powershell
mongosh "mongodb://127.0.0.1:27017"
```

If `net start MongoDB` says the service name doesn’t exist, open **Services** (`services.msc`) and look for a MongoDB service name (commonly `MongoDB`), then start it there.

#### Option A (recommended on macOS): start MongoDB via Homebrew service

1. Install MongoDB Community (if you don’t have it yet):

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
```

2. Start MongoDB:

```bash
brew services start mongodb-community@7.0
```

3. Confirm it’s running:

```bash
brew services list | grep mongodb
```

#### Linux (Ubuntu/Debian) — start via systemd (recommended)

1. Install MongoDB (package names vary by distro; follow MongoDB’s official instructions for your OS version).
2. Start MongoDB:

```bash
sudo systemctl start mongod
```

3. Enable it on boot (optional):

```bash
sudo systemctl enable mongod
```

4. Check status:

```bash
sudo systemctl status mongod
```

5. Verify with `mongosh`:

```bash
mongosh "mongodb://127.0.0.1:27017"
```

If your distro uses a different service name (sometimes `mongodb`), try:

```bash
sudo systemctl start mongodb
```

#### Option B: run `mongod` manually (foreground)

1. Create a data directory (only once):

```bash
mkdir -p ~/data/db
```

2. Start MongoDB:

```bash
mongod --dbpath ~/data/db
```

Keep that terminal open (MongoDB runs there). Open a new terminal for your backend.

#### Verify MongoDB is running (recommended)

In a new terminal:

```bash
mongosh "mongodb://127.0.0.1:27017"
```

If you get a shell prompt, MongoDB is running.

### 1) Install MongoDB Compass

- Download/install MongoDB Compass from MongoDB’s official site.

### 2) Run MongoDB (local) or use MongoDB Atlas

- **Local**: make sure MongoDB is running on your machine (default is `mongodb://127.0.0.1:27017`).
- **Atlas**: create a cluster and copy your connection string.

### 3) Set the same `MONGODB_URI` in `.env`

This backend connects using `MONGODB_URI` from `.env`. For example (local):

```text
MONGODB_URI=mongodb://127.0.0.1:27017/biotrack
```

### 4) Connect Compass

In Compass, click **New Connection** and paste your URI:

- **Local example**: `mongodb://127.0.0.1:27017/biotrack`
- **Atlas example**: `mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority`

Click **Connect**.

### 5) What database/collections to expect

If your URI ends with `/biotrack`, Compass should show a database named **`biotrack`**.

Collections created by this backend:
- `healthcenters`
- `staff`
- `devices`
- `sessions`
- `patients`
- `patientrecords`
- `auditlogs`

### 6) Useful Compass checks while using Postman

After running the Postman flow:

- **Confirm patient created**
  - Database: `biotrack` → Collection: `patients`
  - Sort by `createdAt` (descending) and open the latest document

- **Confirm record created + hashed**
  - Collection: `patientrecords`
  - Check fields: `patientId`, `type`, `recordHash`, `createdByStaffId`, `sessionId`, `deviceId`

- **Confirm “who did what” (auditability)**
  - Collection: `auditlogs`
  - Look for `action` values like:
    - `PATIENT.CREATE`
    - `PATIENT.UPDATE`
    - `RECORD.ADD`
    - `SESSION.START`
  - Verify actor fields:
    - `actorStaffId`
    - `actorDeviceId`
    - `actorSessionId`

### 7) Handy filters (paste into Compass “Filter” box)

- Audit logs for patient creation:

```json
{ "action": "PATIENT.CREATE" }
```

- Audit logs for one patient (replace the id):

```json
{ "entityType": "Patient", "entityId": ObjectId("REPLACE_WITH_PATIENT_ID") }
```

- Records for one patient:

```json
{ "patientId": ObjectId("REPLACE_WITH_PATIENT_ID") }
```

## Quick end-to-end local checklist (MongoDB + API + Compass + Postman)

1. **Start MongoDB** (Option A or B above).
2. Set `.env`:
   - `MONGODB_URI=mongodb://127.0.0.1:27017/biotrack`
3. **Run the backend**:

```bash
npm run dev
```

4. **Open Compass** and connect to:
   - `mongodb://127.0.0.1:27017/biotrack`
5. **Run Postman requests** (Register/Login → Start Session → Create Patient → Add Record).
6. **Check Compass** collections:
   - `patients`, `patientrecords`, `auditlogs`

## Postman (recommended)

### Import

- Import **collection**: `postman/BioTrack-Healthcare.postman_collection.json`
- Import **environment**: `postman/BioTrack-Local.postman_environment.json`

Set environment values:
- `baseUrl` (default `http://localhost:3000`)
- (tokens are automatically filled by scripts after login/session)

## Postman examples (copy/paste)

Use these if you prefer to create requests manually (or to understand what the collection is doing).

### Example 0: Postman environment variables

Create an environment with:
- `baseUrl` = `http://localhost:3000`
- `ADMIN_TOKEN` = (empty)
- `HEALTHCENTER_TOKEN` = (empty)
- `SESSION_TOKEN` = (empty)
- `PATIENT_ID` = (empty)

### Example 1: Register Admin (bootstrap)

**POST** `{{baseUrl}}/api/admin/register`

Headers:
- `Content-Type: application/json`

Body:

```json
{
  "email": "admin@biotrack.local",
  "password": "AdminStrongPassword123!"
}
```

Save the response `accessToken` into `ADMIN_TOKEN`.

### Example 2: Admin creates a Health Center account

**POST** `{{baseUrl}}/api/admin/healthcenters`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer {{ADMIN_TOKEN}}`

Body:

```json
{
  "email": "sanfabiam@gmail.com",
  "password": "StrongPassword123!",
  "name": "San Fabian Barangay Health Center",
  "holderName": "Dr. John Doe",
  "address": "San Fabian, Pangasinan",
  "contactNumber": "09171234567"
}
```

### Example 3: Register Health Center (bootstrap)

**POST** `{{baseUrl}}/api/healthcenters/register`

Headers:
- `Content-Type: application/json`

Body (raw JSON):

```json
{
  "email": "sanfabiam@gmail.com",
  "password": "StrongPassword123!",
  "name": "San Fabian Barangay Health Center",
  "holderName": "Dr. John Doe",
  "address": "San Fabian, Pangasinan",
  "contactNumber": "09171234567"
}
```

Save the response `accessToken` into `HEALTHCENTER_TOKEN`.

### Example 4: Login Health Center (shared account)

**POST** `{{baseUrl}}/api/healthcenters/login`

Headers:
- `Content-Type: application/json`

Body:

```json
{
  "email": "sanfabiam@gmail.com",
  "password": "StrongPassword123!"
}
```

Save `accessToken` → `HEALTHCENTER_TOKEN`.

### Example 5: Start Session (shared)

**POST** `{{baseUrl}}/api/sessions/start`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer {{HEALTHCENTER_TOKEN}}`

Body:

```json
{}
```

Save `sessionToken` → `SESSION_TOKEN`.

### Example 6: Create Patient (requires Session token)

**POST** `{{baseUrl}}/api/patients`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer {{SESSION_TOKEN}}`
- `X-Barangay: San Fabian` (optional)
- `X-Actor-Name: Nurse Ana` (optional)

Body:

```json
{
  "mrn": "SF-0001",
  "lastName": "Dela Cruz",
  "firstName": "Juan",
  "middleInitial": "D",
  "email": "juan.cruz@example.com",
  "password": "PatientPassword123!",
  "birthDate": "1992-03-10",
  "sex": "male",
  "address": "Purok 2, San Fabian",
  "contactNumber": "09990001111"
}
```

Save `patient._id` → `PATIENT_ID`.

### Example 7: Add Patient Record (hashed for integrity)

**POST** `{{baseUrl}}/api/patients/{{PATIENT_ID}}/records`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer {{SESSION_TOKEN}}`
- `X-Barangay: San Fabian` (optional)
- `X-Actor-Name: Nurse Ana` (optional)

Body:

```json
{
  "type": "consultation",
  "data": {
    "complaint": "Fever and cough",
    "temperatureC": 38.2,
    "assessment": "URI",
    "plan": "Paracetamol, fluids, rest"
  },
  "blockchain": { "enabled": true }
}
```

The response includes `recordHash` plus blockchain proof metadata when anchoring is configured.

### Example 8: Verify Patient Record Integrity

**GET** `{{baseUrl}}/api/patients/{{PATIENT_ID}}/records/{{RECORD_ID}}/verify`

Headers:
- `Authorization: Bearer {{SESSION_TOKEN}}`

This verifies:
- DB integrity (`storedHash` vs recomputed hash)
- On-chain proof status (when blockchain is enabled and contracts are configured)

### Example 9: View Audit Logs (who did what)

**GET** `{{baseUrl}}/api/auditlogs`

Headers:
- `Authorization: Bearer {{SESSION_TOKEN}}`
- `X-Barangay: San Fabian` (optional)

Optional filters:
- `{{baseUrl}}/api/auditlogs?action=PATIENT.CREATE`
- `{{baseUrl}}/api/auditlogs?entityType=Patient&entityId={{PATIENT_ID}}`

### Flow to test (in order)

1. **Register Admin** (bootstrap) *(optional if you use HealthCenter self-register)*
2. **Admin creates Health Center** *(recommended)*
3. **Login Health Center**
4. **Start Session**
5. **Create Patient**
6. **Add Patient Record**
7. **Verify Record Integrity**
8. **List Audit Logs**

## API endpoints (what each token is for)

### HealthCenter (shared account)

- `POST /api/healthcenters/register`
- `POST /api/healthcenters/login`

These return a **HealthCenter access token**.

### Admin

- `POST /api/admin/register` (bootstrap)
- `POST /api/admin/login`
- `POST /api/admin/healthcenters` (admin creates health center)

### Sessions

- `POST /api/sessions/start` (requires HealthCenter token)
- `POST /api/sessions/logout` (requires Session token)

Start session body shape:

```json
{}
```

### Patients + Records (requires Session token)

- `GET /api/patients`
- `POST /api/patients`
- `GET /api/patients/:id`
- `PATCH /api/patients/:id`
- `GET /api/patients/:patientId/records`
- `POST /api/patients/:patientId/records`
- `GET /api/patients/:patientId/records/:recordId/verify`

Header:
- `Authorization: Bearer <SESSION_TOKEN>`

### Audit logs (requires Session token)

- `GET /api/auditlogs`

Filters:
- `?action=PATIENT.CREATE`
- `?entityType=Patient&entityId=<id>`

## How multi-device access is handled safely (practical)

- The health center creates **one shared Session** token (you can create multiple if you want, but they are not tied to staff/devices).
- Sessions have `expiresAt` and can be revoked (`revokedAt`) via logout.
- Server stores a `sessionTokenHash` and compares it with the bearer token hash to prevent token substitution.
 

