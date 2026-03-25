# BioTrack Blockchain Gas Tracking (Remix)

This guide tracks gas for a low-cost `setMessage` flow before production use.

Contract used:
- `backend/contracts/BioTrackMessageAnchor.sol`

Why this contract is low-gas:
- `setMessage` is event-only (no storage write).
- Message length is capped at `280` bytes to avoid costly payloads.

---

## 1. Open Remix IDE and Load Contract

1. Open `https://remix.ethereum.org`.
2. Create a file named `BioTrackMessageAnchor.sol`.
3. Paste the contract from `backend/contracts/BioTrackMessageAnchor.sol`.
4. Compile with Solidity `0.8.20+` (optimizer enabled, `runs: 200`).
5. Deploy in `Deploy & Run Transactions` (use `Remix VM` for dry run, then testnet/L2 as needed).

---

## 2. Run `setMessage` (3 Test Cases)

After deployment, call `setMessage` three times with:

1. Short message: `OK`
2. Medium message: 64 chars (example: `mmmm...` x64)
3. Long message: 280 chars (example: `mmmm...` x280)

For each transaction, open the Remix console output and record:
- `Gas cost`
- `Transaction cost`
- `Execution cost`

---

## 3. Wallet-Safe Rule (Before Production)

Use this fee formula:

`tx_fee = gas_used * gas_price`

Set this acceptance gate:
- `setMessage` gas must stay `<= 30,000`.
- Use low-fee networks (testnet/L2) for user-triggered writes.
- If production gas price is high, delay non-urgent writes.
- For user comfort, target `<= $0.10` per write (usually requires near-`1 gwei` conditions).

Quick cost reference for `30,000` gas:
- `1 gwei` -> `0.00003 ETH`
- `5 gwei` -> `0.00015 ETH`
- `20 gwei` -> `0.00060 ETH`

At `ETH = $3,500`, this is approximately:
- `1 gwei` -> `$0.105`
- `5 gwei` -> `$0.525`
- `20 gwei` -> `$2.10`

---

## 4. Baseline Benchmark (Local, March 11, 2026)

Measured with:
- `npm run -w backend gas:benchmark`

Results:

| Test Case | Message Bytes | Gas Used |
|---|---:|---:|
| Case 1 (Short) | 2 | 23,588 |
| Case 2 (64-byte) | 64 | 24,472 |
| Case 3 (280-byte) | 280 | 28,056 |

These are within the `<= 30,000` wallet-safe threshold.

---

## 5. Remix Tracking Table (Fill During Manual Run)

| Test Case | Input | Gas Cost (Remix) | Transaction Cost | Execution Cost | Pass (`<=30000` gas) |
|---|---|---:|---:|---:|---|
| Case 1 | `OK` |  |  |  |  |
| Case 2 | 64-char string |  |  |  |  |
| Case 3 | 280-char string |  |  |  |  |

---

## 6. Optional: Re-run Local Benchmark

```bash
npm run -w backend gas:benchmark
```

If gas rises above `30,000`, reduce payload size or refactor the write path before production rollout.

---

## 7. Project-Scope Gas Tracking (`BioTrackRegistries.sol`)

If you are measuring gas for the actual app contract flow, compile:
- `backend/contracts/BioTrackRegistries.sol`

Then deploy both contracts from the same file:
- `IdentityRegistry`
- `RecordProofRegistry`

Use this table for project-scope tracking.

| Case ID | Contract | Function | Input Profile (String Length Focus) | Pre-Step | Expected | Record |
|---|---|---|---|---|---|---|
| I-1 | `IdentityRegistry` | `registerIdentity` | `identityId` short (8-16), `subjectType` short (6-10), `subjectId` short (8-16) | none | Success tx + event | Gas cost / Tx cost / Execution cost |
| I-2 | `IdentityRegistry` | `registerIdentity` | `identityId` medium (32-64), `subjectType` medium (16-24), `subjectId` medium (32-64) | none | Success tx + event | Gas cost / Tx cost / Execution cost |
| I-3 | `IdentityRegistry` | `registerIdentity` | `identityId` long (80-120), `subjectType` long (32-48), `subjectId` long (80-120) | none | Success tx + event | Gas cost / Tx cost / Execution cost |
| R-1 | `RecordProofRegistry` | `anchorRecord` | `recordId` short (8-16), `patientId` short (8-16), `identityId` short (8-16) | Writer must be authorized | Success tx + event | Gas cost / Tx cost / Execution cost |
| R-2 | `RecordProofRegistry` | `anchorRecord` | `recordId` medium (32-64), `patientId` medium (32-64), `identityId` medium (32-64) | Writer must be authorized | Success tx + event | Gas cost / Tx cost / Execution cost |
| R-3 | `RecordProofRegistry` | `anchorRecord` | `recordId` long (80-120), `patientId` long (80-120), `identityId` long (80-120) | Writer must be authorized | Success tx + event | Gas cost / Tx cost / Execution cost |
| E-1 | `RecordProofRegistry` | `requestRecordExport` | Same anchored `recordId` + `recordHash`, with non-empty `identityId` | `R-*` case must be anchored first | Success tx + event | Gas cost / Tx cost / Execution cost |
| E-2 | `RecordProofRegistry` | `requestRecordExport` | Same anchored `recordId` + `recordHash`, empty `identityId` (`""`) | `R-*` case must be anchored first | Success tx + event | Gas cost / Tx cost / Execution cost |
| A-1 | `IdentityRegistry` | `setWriter` | `account` valid address | Caller is owner | Success tx + event | Gas cost / Tx cost / Execution cost |
| A-2 | `IdentityRegistry` | `setWritesPaused` | `true` then `false` | Caller is owner | Success tx + event | Gas cost / Tx cost / Execution cost |

Suggested pass criteria:
- No unexpected revert on valid inputs.
- Gas profile should scale predictably as string length increases.
- Prioritize low-fee networks (L2/testnet) if end users are paying.
