# BioTrack System Threat Model

Date: March 22, 2026
Scope: Web, mobile, desktop, backend API, MongoDB, blockchain proof flow, AI integrations, and external messaging providers

## 1. System Context

Primary assets:
- Patient identity data
- Patient health records and telemetry
- Session tokens and MFA state
- Admin/provider governance settings
- Audit logs and blockchain proof logs
- Blockchain private keys and contract permissions
- AI insight requests and generated summaries

Primary actors:
- Patient
- Provider / health center staff
- Admin (global or municipal)
- External services: OpenRouter, Google OAuth, MongoDB, SMTP, Twilio, blockchain RPC

## 2. Data Flow Overview

High-level flow:
1. User authenticates through web, mobile, or desktop UI.
2. Client sends authenticated requests to the backend API.
3. Backend validates input, enforces RBAC/session policy, and persists data in MongoDB.
4. Sensitive patient telemetry and record payloads are encrypted before storage.
5. Optional blockchain services anchor integrity proofs for records and audit evidence.
6. Optional AI services send structured prompts to OpenRouter and store resulting insights plus validation metadata.
7. Optional messaging services send email/SMS notifications for onboarding and verification flows.

Trust boundaries:
- Boundary A: Browser/mobile/desktop client to backend API
- Boundary B: Backend API to MongoDB
- Boundary C: Backend API to OpenRouter / Google OAuth / SMTP / Twilio
- Boundary D: Backend API to blockchain RPC and smart contracts
- Boundary E: Admin/provider roles versus patient roles inside the application

## 3. DFD Narrative

Processes:
- P1 Authentication and session management
- P2 Patient record and telemetry ingestion
- P3 AI insight generation and storage
- P4 Admin governance and provider onboarding
- P5 Audit logging and integrity anchoring
- P6 Blockchain proof anchoring and verification

Data stores:
- D1 MongoDB operational data
- D2 Session store
- D3 Audit log store
- D4 AI insight store
- D5 Blockchain proof log store
- D6 Smart contracts for immutable proof anchors

External entities:
- E1 Patient
- E2 Provider / health center
- E3 Admin
- E4 OpenRouter
- E5 Google OAuth
- E6 SMTP / Twilio
- E7 Blockchain RPC

## 4. STRIDE Analysis

| Threat | Example in BioTrack | Affected area | Existing mitigations | Residual risk |
|---|---|---|---|---|
| Spoofing | Reuse or forgery of session/JWT tokens | Auth/session routes | JWT validation, token type checks, session revocation, MFA, OAuth config checks, role middleware | Production secret rotation and secure token storage remain operational requirements |
| Tampering | Editing stored records or audit entries | MongoDB records, audit logs | Encrypted record payloads, deterministic record hashing, blockchain proof anchoring, validation schemas | Privileged DB actor could still tamper with off-chain data before detection |
| Repudiation | User denies a sensitive action | Admin, provider, patient actions | Audit logging with actor, IP, user-agent, session context; blockchain anchoring for critical governance and record actions | Historical logs are strongest when blockchain anchoring is enabled and monitored |
| Information Disclosure | Leakage of PHI, secrets, or inference context | API responses, logs, DB, AI requests | Input validation, generic auth errors, encryption at rest, CSRF, XSS filtering, HTTPS/TLS controls, fallback-safe AI handling | Production logging discipline and secret-vault operations still required |
| Denial of Service | Login brute force, API abuse, oversized payloads | Auth endpoints, uploads, AI routes | Rate limiting, upload byte limits, validation, advisory timeouts, CSRF protection, optional write kill-switches | Large-scale distributed abuse still depends on infrastructure-level controls |
| Elevation of Privilege | Patient accesses provider/admin features; rogue blockchain writer | RBAC, admin routes, smart contracts | Role middleware, admin capability checks, onlyOwner/onlyWriter, expected signer enforcement, writesPaused control | Misconfigured roles or leaked admin credentials remain high-impact operational risks |

## 5. OWASP-Informed Risk Areas

| OWASP area | BioTrack concern | Mitigations in repo |
|---|---|---|
| A01 Broken Access Control | Cross-role access to admin/provider/patient routes | Session auth, role checks, admin capability checks, route guards |
| A02 Cryptographic Failures | Unencrypted PHI or weak secret handling | AES-GCM record encryption, encrypted backups, TLS controls, strong-secret enforcement flags |
| A03 Injection | NoSQL injection, malformed AI inputs, unsafe query values | Zod validation, noSqlSanitize middleware, xssInputGuard, HPP, typed parsers |
| A05 Security Misconfiguration | Insecure env defaults, weak transport rules | Env assertions, TLS flags, HTTPS enforcement, mainnet block by default |
| A07 Identification and Authentication Failures | Weak passwords, MFA bypass, token replay | Password policy, bcrypt hashing, MFA verification, token revocation, session expiry |
| A09 Security Logging and Monitoring Failures | Missing evidence for critical actions | Audit log service, proof logs, admin log views, maintenance checklist |

## 6. Risk Scoring Matrix

Scoring model:
- Likelihood: 1 low to 5 high
- Impact: 1 low to 5 high
- Risk score = likelihood x impact

| ID | Scenario | Likelihood | Impact | Score | Status | Notes |
|---|---|---:|---:|---:|---|---|
| R1 | Session theft or token replay | 3 | 5 | 15 | Mitigated | MFA, token revocation, session expiry reduce blast radius |
| R2 | Tampering with off-chain patient records | 3 | 5 | 15 | Mitigated | Encryption + deterministic hashes + blockchain verification |
| R3 | Unauthorized blockchain writes | 2 | 5 | 10 | Mitigated | onlyOwner/onlyWriter, expected signer, writesPaused, key-ring controls |
| R4 | AI output safety failure or malformed output | 3 | 4 | 12 | Mitigated | JSON schema validation, banned-medical-content checks, fallback mode |
| R5 | Sensitive data exposure in logs or backups | 2 | 5 | 10 | Mitigated | Backup encryption, audit discipline, generic errors, secure env controls |
| R6 | Brute-force login or MFA abuse | 4 | 3 | 12 | Mitigated | Auth rate limits, MFA verification limits, password policy |
| R7 | Misconfigured deployment (TLS/off-chain secrets) | 3 | 5 | 15 | Operational | Requires production infra review, secret manager, and staged verification |

## 7. Control Mapping

| Control objective | Repo evidence |
|---|---|
| Strong authentication | `backend/src/services/authService.js`, `backend/src/middleware/auth.js`, `backend/src/controllers/patientAuthController.js` |
| Server-side validation | `backend/src/middleware/validate.js`, `backend/src/validation/authSchemas.js`, `backend/src/validation/apiSchemas.js` |
| Session and CSRF protection | `backend/src/controllers/sessionController.js`, `backend/src/middleware/csrf.js` |
| Data encryption and backup protection | `backend/src/services/recordDataEncryption.service.js`, `backend/src/services/healthTelemetryEncryption.service.js`, `backend/src/services/databaseBackup.service.js` |
| Auditability | `backend/src/services/auditService.js`, `backend/src/models/AuditLog.js`, `backend/src/models/BlockchainProofLog.js` |
| Smart contract access control | `backend/contracts/BioTrackRegistries.sol`, `backend/src/services/blockchain/client.js` |
| AI safety constraints | `backend/src/services/ai/inference.service.js`, `backend/src/services/ai/*.service.js` |

## 8. Residual Risks

- Off-chain databases remain mutable by sufficiently privileged infrastructure actors.
- AI outputs remain advisory and require clinical/user judgment.
- Production-grade monitoring, SIEM alerting, WAF/rate-limiting at the edge, and secret-vault operations are outside this repo.
- Blockchain anchoring availability depends on RPC and contract configuration.

## 9. Recommended Next Controls

- Add infrastructure-layer threat scenarios for deployment topology and cloud IAM.
- Add formal restore drills and incident runbooks for backup recovery.
- Add continuous AI evaluation reporting to CI using a locked validation dataset.
- Add external pen-test evidence and production config review before final sign-off.
