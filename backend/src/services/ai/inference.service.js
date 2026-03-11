import { aiClient } from './aiClient.js';
import { env } from '../../config/env.js';
import { aiLanguageLabel, normalizeAiLanguage } from './language.service.js';

/**
 * SYSTEM PROMPT
 * Forces the AI to act as a clinical decision support system,
 * not a diagnostic system.
 */
const SYSTEM_PROMPT = `
You are an AI Health Decision Support Assistant.

ROLE:
- Perform risk stratification based on vital signs.
- Provide clinical interpretation and urgency guidance.
- You do NOT diagnose diseases.
- You do NOT name medical conditions.
- You do NOT say "the patient has".

ALLOWED:
- Risk levels: LOW, MODERATE, HIGH, CRITICAL
- Explanatory phrases such as:
  "suggests physiological stress"
  "indicates elevated cardiovascular strain"
- General contributing factors:
  stress, dehydration, fatigue, stimulant intake, lack of sleep

NOT ALLOWED:
- Diagnoses
- Disease names
- Definitive or authoritative medical claims

OUTPUT FORMAT (STRICT - FOLLOW EXACTLY):

AI Health Insight

Risk Level:
<LOW | MODERATE | HIGH | CRITICAL>

Summary:
<one sentence summary>

Clinical Interpretation:
<2-3 sentences explaining why this risk level was assigned>

Possible Contributing Factors:
- <factor 1>
- <factor 2>
- <factor 3>

Recommended Actions:
- <action 1>
- <action 2>
- <action 3>

Urgency Guidance:
<clear guidance on when to monitor or seek professional help>

Disclaimer:
This system does not diagnose medical conditions. It provides risk assessment and decision support only.
`;

/**
 * Rule-based baseline risk assessment
 * (Hybrid intelligence: rules + AI)
 */
export function computeRiskLevel(vitals) {
  if (!vitals?.heartRate) return 'LOW';

  if (vitals.heartRate >= 140) return 'CRITICAL';
  if (vitals.heartRate >= 130) return 'HIGH';
  if (vitals.heartRate >= 110) return 'MODERATE';

  return 'LOW';
}

function resolveAdvisoryTimeoutMs(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return 4500;
  // Keep the timeout in a sane range for prototype responsiveness.
  return Math.max(1000, Math.min(5000, Math.round(parsed)));
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error(`AI advisory timeout after ${timeoutMs}ms`);
      timeoutError.code = 'AI_TIMEOUT';
      reject(timeoutError);
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function buildDisclaimer(language) {
  if (normalizeAiLanguage(language) === 'fil') {
    return 'Paalala: Hindi ito pang-diagnose. Para lamang ito sa risk assessment at decision support.';
  }
  return 'Disclaimer: This system does not diagnose medical conditions. It provides risk assessment and decision support only.';
}

function buildFallbackInsight({ riskHint, language }) {
  if (normalizeAiLanguage(language) === 'fil') {
    return `
AI Health Insight

Risk Level:
${riskHint}

Summary:
Pansamantalang hindi available ang AI analysis.

Clinical Interpretation:
Hindi nakumpleto ng system ang full AI reasoning sa oras na ito. Gumamit ng baseline risk estimation gamit ang predefined thresholds.

Possible Contributing Factors:
- Pansamantalang pagkaantala ng serbisyo

Recommended Actions:
- Magpahinga at i-monitor ang vital signs
- Subukang muli mamaya

Urgency Guidance:
Kung may nakakabahalang sintomas, magpatingin agad sa health professional.

${buildDisclaimer('fil')}
    `.trim();
  }

  return `
AI Health Insight

Risk Level:
${riskHint}

Summary:
AI analysis is temporarily unavailable.

Clinical Interpretation:
The system could not complete full AI reasoning at this time. A baseline risk level was estimated using predefined thresholds.

Possible Contributing Factors:
- Temporary service interruption

Recommended Actions:
- Rest and monitor vital signs
- Retry analysis later

Urgency Guidance:
If concerning symptoms occur, seek medical evaluation.

${buildDisclaimer('en')}
  `.trim();
}

/**
 * Main AI inference function
 */
export async function runHealthInference(vitals, options = {}) {
  const riskHint = computeRiskLevel(vitals);
  const timingEnabled = Boolean(env.AI_TIMING_LOGS);
  const timeoutMs = resolveAdvisoryTimeoutMs(env.AI_ADVISORY_TIMEOUT_MS);
  const language = normalizeAiLanguage(options?.language, 'en');
  const languageLabel = aiLanguageLabel(language);
  let aiRequestMs = null;
  let timedOut = false;
  const model = 'meta-llama/llama-3-8b-instruct';

  try {
    const request = {
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
User state: resting
Preferred response language: ${languageLabel}

Heart rate: ${vitals.heartRate}
Activity level: ${vitals.activity}
Fall detected: ${vitals.fallDetected}
Age range: ${vitals.ageRange}

System pre-assessed risk level: ${riskHint}
          `,
        },
      ],
    };

    let response;
    const timedRequest = withTimeout(aiClient.chat.completions.create(request), timeoutMs);

    if (timingEnabled) {
      const start = process.hrtime.bigint();
      try {
        response = await timedRequest;
      } finally {
        const end = process.hrtime.bigint();
        aiRequestMs = Number(end - start) / 1e6;
      }
    } else {
      response = await timedRequest;
    }

    let output = response.choices[0].message.content?.trim() ?? '';

    // Backend safety enforcement (disclaimer guarantee).
    const disclaimer = buildDisclaimer(language);
    const normalized = output.toLowerCase();
    const hasDisclaimer = normalized.includes('disclaimer') || normalized.includes('paalala') || normalized.includes('does not diagnose') || normalized.includes('hindi ito pang-diagnose');
    if (!hasDisclaimer) {
      output += `\n\n${disclaimer}`;
    }

    return output;
  } catch (err) {
    timedOut = err?.code === 'AI_TIMEOUT';
    console.error('AI INFERENCE ERROR:', err?.message || err);

    // Graceful fallback (system stays operational).
    return buildFallbackInsight({ riskHint, language });
  } finally {
    if (timingEnabled && typeof aiRequestMs === 'number') {
      console.log(
        `[AI_TIMING] runHealthInference model=${model} riskHint=${riskHint} language=${language} timeoutMs=${timeoutMs} timedOut=${timedOut} aiRequestMs=${aiRequestMs.toFixed(1)}`
      );
    }
  }
}
