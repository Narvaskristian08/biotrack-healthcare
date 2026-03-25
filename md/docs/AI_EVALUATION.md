# BioTrack AI Evaluation And Explainability

Date: March 22, 2026
Scope: Risk stratification core, AI guardrails, fallback behavior, and interpretability evidence

## 1. Goal And Design

BioTrack uses a hybrid design:
- Deterministic risk stratification for the core risk label
- LLM-generated explanatory text for summaries, interpretation, and recommendations
- Safety guardrails that reject malformed or unsafe model output and fall back to deterministic text

Design objectives:
- Keep final risk labels stable and explainable
- Prevent diagnostic or disease-label outputs
- Preserve service availability when AI providers fail or time out
- Store evaluation metadata (`usedFallback`, `timedOut`, `validationIssues`, `model`, `promptVersion`) for audit and review

Core evidence:
- `backend/src/services/ai/inference.service.js`
- `backend/src/models/AiInsight.js`

## 2. Validation Dataset

Dataset:
- `backend/test/fixtures/ai-risk-validation-dataset.json`

Validation-set design:
- 24 balanced cases
- 6 cases per class: `LOW`, `MODERATE`, `HIGH`, `CRITICAL`
- Includes threshold-boundary cases at 109/110, 129/130, and 139/140 bpm
- Covers varying activity, fall flags, and age buckets to ensure the core classifier remains stable when non-heart-rate context changes

## 3. Quantitative Metrics

Evaluation script:
- `npm --workspace backend run ai:evaluate`
- Source: `backend/scripts/ai-evaluate.mjs`

Current measured results on the validation set:

| Metric | Result |
|---|---:|
| Accuracy | 1.0000 |
| Macro Precision | 1.0000 |
| Macro Recall | 1.0000 |
| Macro F1 | 1.0000 |

Interpretation:
- The deterministic risk classifier matches the expected gold labels for all 24 validation cases in the current rule set.
- This does not claim clinical validity by itself; it verifies implementation correctness against the intended threshold policy.

## 4. Behavioral Test Coverage

Behavioral test file:
- `backend/test/ai-behavioral-evaluation.test.js`

Covered behaviors:
- Exact threshold transitions for risk labels
- Fallback when model output is not valid JSON
- Fallback when banned medical content appears
- Preservation of rule-based risk label even if the model disagrees
- Timeout fallback path
- Disclaimer-preserving fallback for activity insight
- Safety-preserving fallback for fall insight
- Filipino-language fallback for summary insight
- Trend fallback that exposes measured values rather than opaque text

## 5. Interpretability Evidence

Interpretability mechanisms in the current system:
- Explicit threshold rules for risk classification
- Structured output fields:
  - `riskLevel`
  - `summary`
  - `clinicalInterpretation`
  - `possibleContributingFactors`
  - `recommendedActions`
  - `urgencyGuidance`
- Stored validation metadata:
  - `usedFallback`
  - `timedOut`
  - `validationIssues`
  - `model`
  - `promptVersion`
- UI exposure of fallback/model status for recent advisory records

Why this matters:
- Users and reviewers can trace the primary risk label to stable threshold logic.
- Reviewers can see when the LLM output was accepted versus when fallback logic was used.
- Unsafe outputs are not silently accepted.

## 6. Limits And Next Steps

Current limits:
- The quantitative metrics evaluate the deterministic risk classifier, not clinician-labeled outcome prediction.
- Text quality is behavior-tested, but not yet graded with clinician review rubrics.
- No longitudinal calibration study is included in this repo.

Next steps for stronger external review:
- Add clinician-reviewed text scoring for a locked evaluation set
- Add a larger validation corpus with real-world anonymized telemetry patterns
- Track fallback rate, timeout rate, and validation-issue rate over time
- Add CI enforcement for evaluation thresholds before merges
