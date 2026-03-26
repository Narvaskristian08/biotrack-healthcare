# Sprint 2 Plan And Verification

Date: March 11, 2026  
Project: BioTrack (Group 6)

## Sprint 2 Planning Table

| Track | New Feature | Integration | Success Criteria | Risks And Fixes |
| --- | --- | --- | --- | --- |
| WEB | Period-over-period heart-rate comparison panel in Vitals History | `GET /api/ai/trend-compare` wired to web patient dashboard | Current vs previous window averages and delta are displayed for daily/weekly/monthly modes | Risk: insufficient samples. Fix: show `N/A` and `insufficient_data` status gracefully |
| MOBILE | Offline scan queue with retry sync | `ScanRecordStore` queue + backend dedupe via `sourceClientId` | Scan is retained when offline, queued records sync later, queue count visible in Records page | Risk: duplicate writes on retry. Fix: backend dedupes by `healthCenterId + patientId + sourceClientId` |
| AI | Bilingual advisory output (`en`, `fil`) | Language propagated to `/api/ai/analyze`, `/api/ai/summary`, `/api/ai/trend-insight` | Advisory text can be requested in English or Filipino; fallback also respects language | Risk: AI ignores language. Fix: explicit prompt language hint + language-specific fallback template |
| SENSOR | Live scan quality coach in scan UI | Uses camera signal quality + motion data + estimator confidence | User sees quality score, coaching hint, and sensor status while scanning | Risk: sensor stream errors. Fix: non-crashing sensor fallback labels and continued heart-rate scan |
| BACKEND | Blockchain proof metrics endpoint | `GET /api/admin/blockchain/metrics?days=7..30` with daily aggregates | Admin receives totals, success rate, avg/day, daily breakdown | Risk: heavy aggregation. Fix: bounded query window (max 30 days), indexed proof-log fields |

## Verification (Before vs After)

| Test Case / Scenario | Before State (Sprint 1) | After State (Sprint 2) | Improvement Type |
| --- | --- | --- | --- |
| Web trend review | Single-window trend insight only | Added period-over-period compare (current vs previous) | Expanded feature |
| Mobile offline capture | Network failures could block persistence to backend | Failed submissions are queued locally and retried | Expanded integration |
| Duplicate retry protection | Retries could create duplicate records | `sourceClientId` dedupe on backend create endpoint | Reliability hardening |
| AI advisory language | English-only advisory behavior | `en` and `fil` advisory support with fallback parity | Expanded feature |
| Sensor guidance during scan | Basic labels only | Added quality score, quality level, and actionable coaching text | UX + sensor integration |
| Admin blockchain operations | Overview + recent logs only | Added metrics endpoint and daily status breakdown | Expanded observability |

