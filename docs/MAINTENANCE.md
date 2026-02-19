# Maintenance Notes

This document defines routine maintenance tasks for BioTrack operations.

## 1. Daily Checks

- Confirm backend and web services are reachable.
- Review recent failed auth events from admin monitoring/log endpoints.
- Check for repeated MFA failures and unusual login patterns.

Relevant endpoints:

- `GET /api/admin/monitoring`
- `GET /api/admin/logs`

## 2. Weekly Checks

- Run and verify encrypted backup:
  - `POST /api/admin/governance/backup`
- Validate backup artifact creation in backup directory.
- Review governance and RBAC settings:
  - `GET /api/admin/governance`
  - `GET /api/admin/rbac`

## 3. Monthly Checks

- Rotate JWT secrets and encryption keys in a controlled window.
- Review and prune inactive users/providers per policy.
- Validate TLS posture for MongoDB and runtime configs.
- Run full regression checks from:
  - `README-AUTH.md`
  - `README-TESTING-WEB.md`
  - `README-TESTING-MOBILE.md`
  - `README-TESTING-BLOCKCHAIN.md`

## 4. Secret and Key Management

- Never store production secrets in git.
- Keep secrets in environment/secret manager only.
- If `ENFORCE_STRONG_SECRETS=true`, ensure all JWT secrets are strong and non-placeholder.
- For blockchain mode, treat `BLOCKCHAIN_PRIVATE_KEY` as critical secret.

## 5. Backup and Recovery Practice

- Confirm `backupEnabled` policy before operations.
- Store encrypted backup artifacts in durable storage.
- Periodically run restore drills in non-production environments.
- Record backup/restore activities in operational logs and change records.

## 6. Dependency and Patch Maintenance

- Review dependency updates regularly (`npm audit`, dependency changelogs).
- Apply security updates and re-run smoke tests.
- Rebuild and verify web output before release.

## 7. Incident Response Quick Actions

- Suspected token misuse:
  - Force logout / revoke tokens.
- Suspected blockchain key issue:
  - Set `BLOCKCHAIN_WRITE_DISABLED=true`.
  - Pause contract writes (owner action) if needed.
- Suspected data tamper:
  - Run record verification endpoint.
  - Preserve audit and blockchain proof logs.

## 8. Documentation Hygiene

- Keep docs in `docs/` synchronized with code changes.
- Update API docs whenever routes or auth requirements change.
- Update deployment/troubleshooting notes after each major release.

