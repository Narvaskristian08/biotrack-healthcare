# BioTrack Blockchain Risk Mitigation

This document is the implementation baseline for blockchain risk mitigation in BioTrack.

It maps each identified risk to:
- realistic attack scenario
- mitigation strategy
- current implementation in this repository
- test and operational procedures

## 1. Scope

Covered components:
- Smart contracts:
  - `backend/contracts/BioTrackRegistries.sol`
- Backend blockchain services:
  - `backend/src/services/blockchain/client.js`
  - `backend/src/services/blockchain/identity.service.js`
  - `backend/src/services/blockchain/recordProof.service.js`
  - `backend/src/services/blockchain/abi.js`
- Record integrity pipeline:
  - `backend/src/controllers/patientRecordController.js`
  - `backend/src/models/PatientRecord.js`
- Configuration:
  - `backend/src/config/env.js`
  - `backend/env.example`

## 2. Risk-to-Control Matrix

| Risk Stage | Risk (Realistic Scenario) | Mitigation Strategy | Current Status |
|---|---|---|---|
| Smart Contract Access | Unauthorized actor writes fake hashes or spam entries | `onlyOwner` and writer-role authorization (`onlyWriter`) | Implemented |
| Data Integrity | Weak or partial hashing allows manipulated records to keep valid hash | Deterministic hash schema for complete ordered dataset | Implemented |
| Replay Attack | Reuse of previously valid hash/tx to create duplicate or misleading entries | Unique record data in hash + duplicate rejection at contract/backend | Implemented |
| Private Key Compromise | Stolen backend key writes fraudulent hashes | Write kill switch, signer allowlist check, writer-only contract checks | Implemented |
| Smart Contract Vulnerability | Bad validation/state logic causes corruption or unsafe behavior | Input validation, immutable write constraints, pause control, testnet-first deployment | Implemented (code hardening) + Operational controls required |

## 3. Implemented Mitigations

## 3.1 Smart Contract Access Control

Contract-level access controls:
- `owner` account and `onlyOwner` modifier
- writer authorization map `writers[address]`
- `onlyWriter` modifier applied to write functions

Implemented in:
- `backend/contracts/BioTrackRegistries.sol`
  - `BioTrackAccessControlled`
  - `setWriter(address,bool)`
  - `transferOwnership(address)`
  - `registerIdentity(...)` guarded by `onlyWriter`
  - `anchorRecord(...)` guarded by `onlyWriter`

Security effect:
- only owner or explicitly authorized writer wallet can anchor identity and record hashes.

## 3.2 Data Integrity (Deterministic Hashing Standard)

Record hash schema moved to versioned deterministic form:
- schema: `biotrack.record.v2`
- fields included in hash:
  - `schema`
  - `schemaVersion`
  - `healthCenterId`
  - `patientId`
  - `recordId`
  - `type`
  - `capturedAt` (ISO string)
  - `nonce`
  - `data` (full payload)

Implemented in:
- `backend/src/controllers/patientRecordController.js`
  - `RECORD_HASH_SCHEMA_VERSION`
  - `buildRecordHashV2(...)`
  - `buildRecordHashForRecord(...)` (with legacy fallback)
- `backend/src/models/PatientRecord.js`
  - `hashSchemaVersion`
  - `recordNonce`
  - `capturedAt`

Security effect:
- prevents valid-hash generation from partial datasets.
- supports forward hash schema evolution while retaining old record compatibility.

## 3.3 Replay Attack Mitigation

Replay defenses:
- unique hash ingredients include `recordId + capturedAt + nonce`.
- duplicate hash rejection at backend before insertion.
- duplicate hash rejection on-chain via `anchoredRecordHashes`.
- duplicate `recordId` rejection on-chain via immutable mapping.

Implemented in:
- Backend:
  - `backend/src/controllers/patientRecordController.js`
    - nonce generation
    - duplicate `recordHash` check
- Contract:
  - `backend/contracts/BioTrackRegistries.sol`
    - `anchoredRecordHashes`
    - `require(!anchoredRecordHashes[recordHash], "Record hash already anchored")`
    - `require(!recordById[recordKey].exists, "Record already anchored")`
    - `isRecordHashAnchored(bytes32)`
- Service precheck:
  - `backend/src/services/blockchain/recordProof.service.js`
    - optional `isRecordHashAnchored` read before anchor write

Security effect:
- blocks duplicate/replayed hash submissions at both application and contract layers.

## 3.4 Private Key Compromise Mitigation

Mitigations in backend runtime:
- global write kill switch:
  - `BLOCKCHAIN_WRITE_DISABLED`
- expected signer check:
  - `BLOCKCHAIN_EXPECTED_SIGNER`
  - runtime compare against derived wallet from active signing key
- key rotation support:
  - `BLOCKCHAIN_PRIVATE_KEYS` (comma-separated key ring)
  - `BLOCKCHAIN_ACTIVE_KEY_INDEX` (active key selector)
- testnet-first safety gate:
  - `BLOCKCHAIN_ALLOW_MAINNET=false` blocks accidental mainnet usage until explicitly enabled
- contract write access assertion:
  - fails if contract is paused
  - fails if signer is neither owner nor writer

Implemented in:
- `backend/src/config/env.js`
- `backend/env.example`
- `backend/src/services/blockchain/client.js`
  - `blockchainWriteDisabled()`
  - `getSignerAddress()`
  - expected signer mismatch protection
  - `assertContractWriteAccess(contract)`
- enforced in:
  - `backend/src/services/blockchain/identity.service.js`
  - `backend/src/services/blockchain/recordProof.service.js`

Security effect:
- fast containment if compromise suspected.
- prevents accidental writes from wrong or rotated private keys.

## 3.5 Smart Contract Vulnerability Hardening

Hardening controls applied:
- pause capability for emergency stop:
  - `writesPaused`
  - `setWritesPaused(bool)` (owner-only)
- strict input validation:
  - non-empty IDs and required fields
  - non-zero hashes
- immutable write semantics:
  - identity ID cannot be overwritten
  - record ID cannot be overwritten

Implemented in:
- `backend/contracts/BioTrackRegistries.sol`
  - `setWritesPaused(...)`
  - validation checks in `registerIdentity(...)` and `anchorRecord(...)`

Security effect:
- reduces exploitability from malformed input and unsafe state transitions.
- enables rapid incident shutdown without redeployment.

## 4. Operational Controls Required

Code controls are not enough without operations.

Required deployment controls:
- deploy contracts first on testnet, not mainnet.
- validate with multiple wallet accounts (owner/writer/non-writer).
- restrict backend host and secret access.
- rotate compromised keys immediately.
- keep `BLOCKCHAIN_WRITE_DISABLED=true` during incident triage.

Recommended secret handling:
- move blockchain private keys to a secret vault (not plain `.env` in production).
- never expose key in logs, screenshots, demos, or docs.

## 5. Environment Configuration

Key blockchain variables:
- `BLOCKCHAIN_ENABLED`
- `BLOCKCHAIN_STRICT_MODE`
- `BLOCKCHAIN_WRITE_DISABLED`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_PRIVATE_KEYS`
- `BLOCKCHAIN_ACTIVE_KEY_INDEX`
- `BLOCKCHAIN_EXPECTED_SIGNER`
- `BLOCKCHAIN_ALLOW_MAINNET`
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

See:
- `backend/env.example`

## 6. Deployment and Authorization Runbook

## 6.1 Deploy Contracts

Deploy:
- `IdentityRegistry`
- `RecordProofRegistry`

Record addresses in:
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

Before go-live:
- keep `BLOCKCHAIN_ALLOW_MAINNET=false` during testnet validation.
- only set `BLOCKCHAIN_ALLOW_MAINNET=true` after testnet checks and signer authorization are complete.

## 6.2 Authorize Backend Wallet

From owner wallet:
- call `setWriter(backendWallet, true)` on `IdentityRegistry`
- call `setWriter(backendWallet, true)` on `RecordProofRegistry`

## 6.3 Validate Owner/Writer Controls

Expected behavior:
- non-writer `registerIdentity` fails with `Not authorized`.
- non-writer `anchorRecord` fails with `Not authorized`.
- writer calls succeed.

## 6.4 Emergency Pause Procedure

From owner wallet:
- call `setWritesPaused(true)` on both contracts.

Expected backend behavior:
- writes fail because contract is paused.
- read verification methods remain available.

Resume:
- `setWritesPaused(false)` after incident resolution.

## 7. Test Checklist by Risk

## 7.1 Smart Contract Access

- attempt write from non-writer wallet.
- verify revert with `Not authorized`.
- authorize writer and verify successful write.

## 7.2 Data Integrity

- create record and store hash.
- modify DB record payload manually without updating `recordHash`.
- run verify endpoint and confirm status indicates tampering/mismatch.

## 7.3 Replay Attack

- attempt to anchor same `recordHash` again.
- confirm contract rejects duplicate hash.
- attempt to anchor same `recordId` again.
- confirm contract rejects duplicate record ID.

## 7.4 Private Key Compromise Controls

- set `BLOCKCHAIN_WRITE_DISABLED=true`.
- attempt record anchoring.
- confirm write path is skipped/blocked.
- set `BLOCKCHAIN_EXPECTED_SIGNER` to different address than private key.
- confirm write fails due to signer mismatch.

## 7.5 Contract Vulnerability Hardening

- call write function with empty required fields.
- confirm revert due to validation checks.
- pause writes and confirm all write methods reject while paused.

## 8. Residual Risks and Future Enhancements

Residual risks:
- off-chain DB can still be modified by privileged DB actors.
- backend compromise still impacts pre-chain processing.
- availability depends on RPC provider uptime.

Recommended next enhancements:
- multi-sig owner for contracts.
- timelock for ownership and writer changes.
- dedicated SIEM alerts for writer change, pause toggle, and failed verify spikes.
- independent contract audit before production launch.

## 9. Audit Evidence Sources

Use these for audit and incident investigations:
- `blockchainprooflogs` collection
- patient record verification responses
- contract events:
  - `WriterUpdated`
  - `WritesPausedChanged`
  - `IdentityRegistered`
  - `RecordAnchored`

## 10. Summary

BioTrack now has layered mitigation for the major blockchain risks:
- authorization controls on write paths
- deterministic and complete hashing
- replay defenses at app and contract layers
- key-compromise containment controls
- safer contract state transitions with emergency pause

Final security depends on correct operations: secure key custody, role governance, testnet validation, and continuous monitoring.
