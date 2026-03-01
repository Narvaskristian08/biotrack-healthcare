# BioTrack Blockchain Testing Guide

This guide explains how to test the new blockchain identity and record integrity features end-to-end.

It covers:
- Local mode (blockchain disabled, API should still work)
- On-chain mode (identity and record hashes anchored to smart contracts)
- Integrity verification and tamper detection
- Failure behavior in strict mode

## 1. What You Are Testing

The backend now supports:
- Blockchain-linked identity references for `Patient` and `HealthCenter`
- Optional on-chain identity registration and login-time verification
- Record hash anchoring on-chain when records are created
- A verification endpoint that checks DB hash integrity plus blockchain proof

Main files involved:
- `backend/src/services/blockchain/client.js`
- `backend/src/services/blockchain/identity.service.js`
- `backend/src/services/blockchain/recordProof.service.js`
- `backend/src/controllers/patientRecordController.js`
- `backend/src/controllers/patientAuthController.js`
- `backend/src/controllers/healthCenterController.js`

## 2. API Endpoints Under Test

- `POST /api/admin/register`
- `POST /api/admin/login`
- `POST /api/admin/healthcenters`
- `POST /api/admin/providers/:providerId/credential-status`
- `POST /api/healthcenters/register` (negative test: expected `403`, self-register is blocked)
- `POST /api/healthcenters/login`
- `POST /api/sessions/start`
- `POST /api/patients`
- `POST /api/patients/register`
- `POST /api/patients/login`
- `POST /api/patients/:patientId/records`
- `GET /api/patients/:patientId/records/:recordId/verify`
- `GET /api/auditlogs`

## 3. Prerequisites

- Node.js 18+ (Node 20+ recommended)
- MongoDB running locally or remotely
- Dependencies installed (`npm install`)
- Postman (recommended)
- Optional for on-chain test:
  - An EVM RPC endpoint (local chain or testnet)
  - Deployed identity and record proof smart contracts
  - Deployer private key with gas funds

## 4. Environment Setup

For full env setup across backend/web/mobile, see `README-ENV.md`.

1. Copy env template:

```bash
cp backend/env.example backend/.env
```

PowerShell:

```powershell
Copy-Item backend/env.example backend/.env
```

2. Set required backend values in `backend/.env`:

- `PORT`
- `MONGODB_URI`
- `ADMIN_JWT_SECRET`
- `HEALTHCENTER_JWT_SECRET`
- `SESSION_JWT_SECRET`
- `OPENROUTER_API_KEY` (non-empty; server requires it at startup)

3. Blockchain toggles:

- `BLOCKCHAIN_ENABLED=false` for local-only flow
- `BLOCKCHAIN_ENABLED=true` for on-chain flow
- `BLOCKCHAIN_STRICT_MODE=false` to allow graceful fallback
- `BLOCKCHAIN_STRICT_MODE=true` to fail requests when chain operations fail

4. On-chain fields (required only when `BLOCKCHAIN_ENABLED=true`):

- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY` (single-key mode) or `BLOCKCHAIN_PRIVATE_KEYS` + `BLOCKCHAIN_ACTIVE_KEY_INDEX` (rotation mode)
- `BLOCKCHAIN_ALLOW_MAINNET=false` during testnet validation
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

## 5. Run Backend

```bash
npm install
npm run dev:backend
```

Expected startup message:

```text
Server running at http://localhost:3000
```

## 6. Postman Setup (Recommended)

Import:
- `postman/BioTrack-Healthcare.postman_collection.json`
- `postman/BioTrack-Local.postman_environment.json`

Environment variables used:
- `baseUrl`
- `ADMIN_TOKEN`
- `HEALTHCENTER_TOKEN`
- `SESSION_TOKEN`
- `PATIENT_ID`
- `RECORD_ID`

## 7. Test Flow A: Local-Only (Blockchain Disabled)

Set in `backend/.env`:

```text
BLOCKCHAIN_ENABLED=false
BLOCKCHAIN_STRICT_MODE=false
```

Run this request order:

1. `Admin - Register (bootstrap)`
2. `Admin - Login`
3. `Admin - Create HealthCenter` (create with status `active`, or activate before login)
4. `HealthCenter - Login`
5. `Session - Start (Shared)`
6. `Patient - Create`
7. `PatientRecord - Add`
8. `PatientRecord - Verify Integrity`
9. `AuditLogs - List`

If provider is not `active` yet:
- `POST /api/admin/providers/:providerId/credential-status` with `{"status":"active"}`

Expected behavior:
- Registration/login responses include `blockchainIdentity` object
- Identity `verificationStatus` should be `local_only` (or `pending` if existing data)
- Record create returns `record.recordHash` and `record.blockchain`
- Verify endpoint returns:
  - `status: "local_hash_only"` in local-only mode
  - `dbIntegrity.match: true`

Example verify response shape:

```json
{
  "recordId": "....",
  "patientId": "....",
  "status": "local_hash_only",
  "dbIntegrity": {
    "storedHash": "....",
    "recomputedHash": "....",
    "match": true
  },
  "blockchain": {
    "available": false,
    "reason": "BLOCKCHAIN_DISABLED"
  }
}
```

## 8. Test Flow B: On-Chain (Blockchain Enabled)

Set in `backend/.env`:

```text
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_STRICT_MODE=false
BLOCKCHAIN_RPC_URL=...
BLOCKCHAIN_PRIVATE_KEY=...
BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS=...
BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS=...
```

Repeat the same request order in Section 7.

Expected behavior:
- On registration, identity may be anchored with:
  - `blockchainIdentity.txId`
  - `blockchainIdentity.verificationStatus: "anchored"`
- On login:
  - `blockchainIdentity.verified: true` when on-chain verification succeeds
- Record create:
  - `record.blockchain.txId` present
  - `record.blockchain.verificationStatus: "anchored"`
- Verify endpoint:
  - `status: "verified"`
  - `blockchain.available: true`
  - `blockchain.verified: true`

## 9. Smart Contract Interface Requirements

Your deployed contracts must expose these exact methods.

Identity registry:

```solidity
function registerIdentity(
  string memory identityId,
  bytes32 identityHash,
  string memory subjectType,
  string memory subjectId
) external returns (bytes32 proofId);

function isIdentityRegistered(
  string memory identityId,
  bytes32 identityHash
) external view returns (bool);
```

Record proof registry:

```solidity
function anchorRecord(
  string memory recordId,
  string memory patientId,
  bytes32 recordHash,
  string memory identityId
) external returns (bytes32 proofId);

function verifyRecord(
  string memory recordId,
  bytes32 recordHash
) external view returns (bool verified, uint256 anchoredAt, string memory identityId);
```

Reference ABI file:
- `backend/src/services/blockchain/abi.js`

## 10. Tamper Detection Test

Goal: prove that DB modification without corresponding hash/proof update is detected.

1. Create a patient record through API (normal flow).
2. Save `PATIENT_ID` and `RECORD_ID`.
3. Modify stored record data directly in MongoDB (do not update `recordHash`):

```javascript
// mongosh example
use biotrack
db.patientrecords.updateOne(
  { _id: ObjectId("RECORD_ID_HERE") },
  { $set: { "data.assessment": "manually tampered value" } }
)
```

4. Call:

```text
GET /api/patients/:patientId/records/:recordId/verify
```

Expected result:
- `status: "tampered"`
- `dbIntegrity.match: false`

## 11. Strict Mode Failure Test

Goal: confirm requests fail when blockchain action fails and strict mode is enabled.

1. Set:

```text
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_STRICT_MODE=true
```

2. Intentionally break one blockchain setting (example: wrong `BLOCKCHAIN_RPC_URL`).
3. Restart server.
4. Try one of:
- HealthCenter login
- Patient register/login
- Add patient record with blockchain enabled

Expected result:
- API returns 5xx (typically 502)
- Error codes may include:
  - `BLOCKCHAIN_IDENTITY_ANCHOR_FAILED`
  - `BLOCKCHAIN_IDENTITY_VERIFY_FAILED`
  - `BLOCKCHAIN_RECORD_ANCHOR_FAILED`
  - `BLOCKCHAIN_VERIFY_FAILED`

## 12. Wallet Address Tests

Wallet support is optional, but if provided:
- Must be a valid EVM address
- Must be unique across patients and health centers

Test cases:

1. Valid wallet:
- Register user with `walletAddress`
- Expect success

2. Invalid wallet format:
- Register user with malformed address
- Expect `400` with `WALLET_ADDRESS_INVALID`

3. Duplicate wallet:
- Register second account using same wallet
- Expect `409` with `WALLET_ADDRESS_ALREADY_USED`

## 13. Key Rotation and Mainnet Safety Tests

1. Key rotation:
- Set `BLOCKCHAIN_PRIVATE_KEYS=0xold,0xnew`
- Set `BLOCKCHAIN_ACTIVE_KEY_INDEX=1`
- Set `BLOCKCHAIN_EXPECTED_SIGNER` to `0xnew` wallet address
- Restart backend and create a new anchored record
- Expect anchoring to succeed using the selected key

2. Mainnet safety gate:
- Set `BLOCKCHAIN_ALLOW_MAINNET=false`
- Point `BLOCKCHAIN_RPC_URL` to a mainnet endpoint
- Restart backend and call blockchain-dependent flow
- Expect failure with `Mainnet network is blocked while BLOCKCHAIN_ALLOW_MAINNET=false`

3. Controlled mainnet release:
- Set `BLOCKCHAIN_ALLOW_MAINNET=true`
- Repeat the same flow
- Expect backend to proceed (assuming signer and writer authorization are correct)

## 14. Database Verification Checklist

Check these collections in MongoDB:

- `patients`
  - `blockchainIdentity.identityId`
  - `blockchainIdentity.identityHash`
  - `blockchainIdentity.verificationStatus`

- `healthcenters`
  - `blockchainIdentity.identityId`
  - `blockchainIdentity.txId`

- `patientrecords`
  - `recordHash`
  - `blockchain.txId`
  - `blockchain.verificationStatus`
  - `blockchain.lastVerifiedAt`

- `blockchainprooflogs`
  - `kind` (`identity`, `record`, `verification`)
  - `status` (`success`, `failed`, `skipped`)
  - `txId`, `proofId`, `reason`

## 15. Troubleshooting

1. Server exits on startup:
- Check required envs in `backend/src/config/env.js`
- Ensure `OPENROUTER_API_KEY` is set (non-empty)

2. Blockchain enabled but no txId:
- Verify contract addresses are set
- Verify ABI compatibility with deployed contracts
- Check `blockchainprooflogs.reason`

3. Login verification not on-chain:
- Contract may not implement `isIdentityRegistered`
- You may see reason `IDENTITY_VERIFY_METHOD_UNAVAILABLE`

4. Verify endpoint returns `anchor_mismatch`:
- DB hash is unchanged, but chain proof for `(recordId, hash)` was not found
- Confirm record was anchored and same hash was used

5. CORS/browser issues:
- Check CORS behavior in `backend/src/index.js` and `backend/.env` (`CORS_ORIGIN`)

## 16. Quick Pass/Fail Matrix

- Identity ref generated at registration: `PASS/FAIL`
- Identity on-chain verification at login: `PASS/FAIL`
- Record hash generated on create: `PASS/FAIL`
- Record hash anchored on-chain: `PASS/FAIL`
- Verify endpoint detects untampered data: `PASS/FAIL`
- Verify endpoint detects tampered data: `PASS/FAIL`
- Strict mode fails on blockchain error: `PASS/FAIL`

## 17. Suggested Demo Script (Capstone)

1. Admin create health center (active), then login health center
2. Create patient (show blockchain identity in response)
3. Create patient record with blockchain enabled (show `recordHash` and `txId`)
4. Run integrity verify endpoint (`status: verified`)
5. Tamper record in MongoDB
6. Re-run verify endpoint (`status: tampered`)
7. Show `blockchainprooflogs` entries as audit proof
