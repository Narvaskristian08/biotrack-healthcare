# Performance And Security Test Results

Generated at: 2026-03-11T09:47:41.247Z

## Performance Test Pack

| Test Case | Steps (Short) | Expected | Actual (time/gas) | Pass/Fail | Note |
| --- | --- | --- | --- | --- | --- |
| Normal Input | Submit standard text | < 200ms | 61.8ms / gas 23,888 | PASS | Baseline |
| Long Input | Paste 1000+ chars | Process/Error | 22.1ms / revert: execution reverted: "message too long" | PASS | Stress length guard |
| Empty Input | Submit blank field | Handle gracefully | 11.2ms / revert: execution reverted: "message required" | PASS | Validation guard |
| Custom Case 1 | Submit 64-char payload | < 200ms | 44.4ms / gas 24,472 | PASS | Medium payload |
| Custom Case 2 | Submit max 280-char payload | < 250ms | 62.9ms / gas 28,056 | PASS | Boundary payload |

Slowest case: **Custom Case 2** (62.9ms).

## Security Test Pack

| Test Case | Steps (Short) | Expected | Actual | Pass/Fail | Note |
| --- | --- | --- | --- | --- | --- |
| Authorization | Call setWriter as non-owner | Revert "Not authorized" | Reverted: execution reverted: "Not authorized" | PASS | Access Control |
| Invalid Input | Call registerIdentity with empty identityId | Revert/Safe handle | Reverted: execution reverted: "identityId required" | PASS | Edge Case |
| Data Exposure | Inspect IdentityRegistered event fields | No sensitive leaks | No sensitive value leaked (subjectIdHash: 0x0fd105a3ebfcee30d0c9a00b9148f99a21a6af5c639d8fca4c107cb23166fbe9) | PASS | Privacy |
| Replay Attack | Re-submit same identityId/hash | Revert duplicate | Reverted: execution reverted: "IdentityId already used" | PASS | Replay Guard |
| Emergency Pause | Pause writes, then call registerIdentity | Revert "Writes paused" | Reverted: execution reverted: "Writes paused" | PASS | Safety Switch |
| Record Hash Replay | Anchor second record with same recordHash | Revert duplicate hash | Reverted: execution reverted: "Record hash already anchored" | PASS | Integrity |
| Record Authorization | Call anchorRecord as non-writer | Revert "Not authorized" | Reverted: execution reverted: "Not authorized" | PASS | Access Control |

Most concerning risk: **None identified**.
Reason: No failing security case in this run.

Recommended fix for best risk:

- Keep this case monitored in CI and rerun pack after contract or API changes.

## Notes

- Local benchmark environment: Ganache in-memory chain.
- Performance timings reflect local execution latency and are best used for relative comparison.
- Security results are contract-level behavior checks for access control, input validation, replay resistance, and data exposure.
