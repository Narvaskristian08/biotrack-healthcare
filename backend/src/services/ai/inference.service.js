import { aiClient } from './aiClient.js';
import { env } from '../../config/env.js';
import { aiLanguageLabel, normalizeAiLanguage } from './language.service.js';
import { z } from 'zod';

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

OUTPUT FORMAT (STRICT):
- Return ONE valid JSON object only (no markdown, no code fences, no extra text).
- Keys (exact): riskLevel, summary, clinicalInterpretation, possibleContributingFactors, recommendedActions, urgencyGuidance
- riskLevel MUST exactly equal the pre-assessed risk level given to you.
- summary: one sentence
- clinicalInterpretation: 2-3 sentences, no diagnoses, no disease names
- possibleContributingFactors: array of 2-4 general factors (no diseases)
- recommendedActions: array of 2-4 actions
- urgencyGuidance: short paragraph
`;

const INSIGHT_PROMPT_VERSION = 'health-insight-json-v1';
const INSIGHT_MODEL = 'meta-llama/llama-3-8b-instruct';

const MODEL_OUTPUT_SCHEMA = z
  .object({
    riskLevel: z.string().optional(),
    summary: z.string(),
    clinicalInterpretation: z.string(),
    possibleContributingFactors: z.array(z.string()),
    recommendedActions: z.array(z.string()),
    urgencyGuidance: z.string(),
  })
  .passthrough();

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

function normalizeTextLine(value, maxLen = 280) {
  if (typeof value !== 'string') return '';
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (!maxLen || collapsed.length <= maxLen) return collapsed;
  return collapsed.slice(0, maxLen).trim();
}

function normalizeTextList(value, { maxItems = 4, maxLen = 140 } = {}) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => normalizeTextLine(entry, maxLen))
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  for (const entry of normalized) {
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
    if (deduped.length >= maxItems) break;
  }
  return deduped;
}

function extractJsonObject(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function containsBannedMedicalContent(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  const normalized = text.toLowerCase();
  const banned = [
    /\bdiagnos(?:is|e|ed|ing)?\b/i,
    /\b(hypertension|diabetes|asthma|pneumonia|infection|covid(?:-19)?|cancer|stroke|sepsis|arrhythmia|atrial fibrillation|afib|heart attack|myocard(?:ial)?|infarct(?:ion)?)\b/i,
  ];
  return banned.some((pattern) => pattern.test(normalized));
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

function buildFallbackInsightData({ riskHint, language }) {
  const disclaimer = buildDisclaimer(language);

  if (normalizeAiLanguage(language) === 'fil') {
    const insight = {
      riskLevel: riskHint,
      summary: 'Pansamantalang hindi available ang AI analysis.',
      clinicalInterpretation:
        'Hindi nakumpleto ng system ang full AI reasoning sa oras na ito. Gumamit ng baseline risk estimation gamit ang predefined thresholds.',
      possibleContributingFactors: ['Pansamantalang pagkaantala ng serbisyo'],
      recommendedActions: ['Magpahinga at i-monitor ang vital signs', 'Subukang muli mamaya'],
      urgencyGuidance: 'Kung may nakakabahalang sintomas, magpatingin agad sa health professional.',
      disclaimer,
    };

    return { insight, text: renderInsightText(insight) };
  }

  const insight = {
    riskLevel: riskHint,
    summary: 'AI analysis is temporarily unavailable.',
    clinicalInterpretation:
      'The system could not complete full AI reasoning at this time. A baseline risk level was estimated using predefined thresholds.',
    possibleContributingFactors: ['Temporary service interruption'],
    recommendedActions: ['Rest and monitor vital signs', 'Retry analysis later'],
    urgencyGuidance: 'If concerning symptoms occur, seek medical evaluation.',
    disclaimer,
  };

  return { insight, text: renderInsightText(insight) };
}

function renderInsightText(insight) {
  const riskLevel = normalizeTextLine(insight?.riskLevel ?? '', 20);
  const summary = normalizeTextLine(insight?.summary ?? '', 240);
  const clinicalInterpretation = normalizeTextLine(insight?.clinicalInterpretation ?? '', 900);
  const factors = normalizeTextList(insight?.possibleContributingFactors ?? [], { maxItems: 4, maxLen: 140 });
  const actions = normalizeTextList(insight?.recommendedActions ?? [], { maxItems: 4, maxLen: 160 });
  const urgencyGuidance = normalizeTextLine(insight?.urgencyGuidance ?? '', 500);
  const disclaimer = normalizeTextLine(insight?.disclaimer ?? '', 240);

  const lines = [
    'AI Health Insight',
    '',
    'Risk Level:',
    riskLevel || 'LOW',
    '',
    'Summary:',
    summary || 'No summary available.',
    '',
    'Clinical Interpretation:',
    clinicalInterpretation || 'No interpretation available.',
    '',
    'Possible Contributing Factors:',
  ];

  if (factors.length) {
    lines.push(...factors.map((factor) => `- ${factor}`));
  } else {
    lines.push('- None identified');
  }

  lines.push('', 'Recommended Actions:');
  if (actions.length) {
    lines.push(...actions.map((action) => `- ${action}`));
  } else {
    lines.push('- Continue monitoring');
  }

  lines.push('', 'Urgency Guidance:');
  lines.push(urgencyGuidance || 'Seek medical advice if symptoms worsen.');
  lines.push('', disclaimer || buildDisclaimer('en'));

  return lines.join('\n');
}

function formatContext(context) {
  if (!context || typeof context !== 'object') return '';

  const lines = [];
  const previousRiskLevel = normalizeTextLine(context?.previousRiskLevel ?? '', 20);
  if (previousRiskLevel) lines.push(`Previous risk level: ${previousRiskLevel}`);

  const trend = normalizeTextLine(context?.trendData?.trend ?? '', 40);
  if (trend) {
    const baseline = context?.trendData?.baseline;
    const baselineNumber = Number.isFinite(Number(baseline)) ? Number(baseline) : null;
    const baselineText = baselineNumber === null ? '' : ` (baseline: ${baselineNumber.toFixed(1)} bpm)`;
    lines.push(`Trend: ${trend}${baselineText}`);
  }

  const recent = Array.isArray(context?.trendData?.recentHeartRates)
    ? context.trendData.recentHeartRates
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .slice(-10)
    : [];
  if (recent.length) {
    lines.push(`Recent heart rates (most recent last): ${recent.join(', ')}`);
  }

  const alerts = Array.isArray(context?.alerts) ? context.alerts : [];
  if (alerts.length) {
    const alertSummary = alerts
      .map((alert) => {
        const type = normalizeTextLine(alert?.type ?? '', 60);
        const severity = normalizeTextLine(alert?.severity ?? '', 20);
        return [type, severity].filter(Boolean).join(':');
      })
      .filter(Boolean)
      .slice(0, 6)
      .join(', ');

    if (alertSummary) lines.push(`Alerts triggered: ${alertSummary}`);
  }

  if (!lines.length) return '';
  return `\n\nPatient context (derived from stored records):\n- ${lines.join('\n- ')}`;
}

/**
 * Main AI inference function
 */
export async function generateHealthInsight(vitals, options = {}) {
  const riskHint = options?.riskHint ?? computeRiskLevel(vitals);
  const timingEnabled = Boolean(env.AI_TIMING_LOGS);
  const timeoutMs = resolveAdvisoryTimeoutMs(env.AI_ADVISORY_TIMEOUT_MS);
  const language = normalizeAiLanguage(options?.language, 'en');
  const languageLabel = aiLanguageLabel(language);
  let aiRequestMs = null;
  let timedOut = false;
  const model = INSIGHT_MODEL;
  const validationIssues = [];
  const fallback = buildFallbackInsightData({ riskHint, language });

  try {
    const activityInput = vitals?.activity ?? null;
    const activityLevel = vitals?.activityLevel ?? null;
    const ageRange = vitals?.ageRange ?? null;
    const signalQuality = vitals?.signalQuality ?? null;
    const fingerDetected = vitals?.fingerDetected ?? null;
    const movementIntensity = vitals?.movementIntensity ?? null;

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

Pre-assessed risk level (MUST output exactly): ${riskHint}

Heart rate: ${vitals.heartRate}
Activity input: ${activityInput ?? 'N/A'}
Activity level (normalized): ${activityLevel ?? 'N/A'}
Fall detected: ${vitals.fallDetected}
Age range: ${ageRange ?? 'N/A'}
Signal quality: ${signalQuality ?? 'N/A'}
Finger detected: ${fingerDetected ?? 'N/A'}
Movement intensity: ${movementIntensity ?? 'N/A'}${formatContext(options?.context)}
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

    const output = response.choices[0].message.content?.trim() ?? '';
    const parsedJson = extractJsonObject(output);
    if (!parsedJson) {
      validationIssues.push('MODEL_OUTPUT_NOT_JSON');
      return {
        text: fallback.text,
        insight: fallback.insight,
        usedFallback: true,
        validationIssues,
        model,
        promptVersion: INSIGHT_PROMPT_VERSION,
        aiRequestMs,
        timedOut,
      };
    }

    const parsed = MODEL_OUTPUT_SCHEMA.safeParse(parsedJson);
    if (!parsed.success) {
      validationIssues.push('MODEL_OUTPUT_SCHEMA_INVALID');
      return {
        text: fallback.text,
        insight: fallback.insight,
        usedFallback: true,
        validationIssues,
        model,
        promptVersion: INSIGHT_PROMPT_VERSION,
        aiRequestMs,
        timedOut,
      };
    }

    const data = parsed.data;

    const summary = normalizeTextLine(data.summary, 240);
    const clinicalInterpretation = normalizeTextLine(data.clinicalInterpretation, 900);
    const possibleContributingFactors = normalizeTextList(data.possibleContributingFactors, { maxItems: 4, maxLen: 140 });
    const recommendedActions = normalizeTextList(data.recommendedActions, { maxItems: 4, maxLen: 160 });
    const urgencyGuidance = normalizeTextLine(data.urgencyGuidance, 500);

    const combinedText = [
      data.riskLevel,
      summary,
      clinicalInterpretation,
      possibleContributingFactors.join(' '),
      recommendedActions.join(' '),
      urgencyGuidance,
    ]
      .filter(Boolean)
      .join('\n');

    if (containsBannedMedicalContent(combinedText)) {
      validationIssues.push('BANNED_MEDICAL_CONTENT');
      return {
        text: fallback.text,
        insight: fallback.insight,
        usedFallback: true,
        validationIssues,
        model,
        promptVersion: INSIGHT_PROMPT_VERSION,
        aiRequestMs,
        timedOut,
      };
    }

    const modelRisk = normalizeTextLine(data.riskLevel ?? '', 20).toUpperCase();
    if (modelRisk && modelRisk !== riskHint) {
      validationIssues.push('RISK_LEVEL_MISMATCH');
    }

    const disclaimer = buildDisclaimer(language);
    const insight = {
      riskLevel: riskHint,
      summary: summary || fallback.insight.summary,
      clinicalInterpretation: clinicalInterpretation || fallback.insight.clinicalInterpretation,
      possibleContributingFactors: possibleContributingFactors.length ? possibleContributingFactors : fallback.insight.possibleContributingFactors,
      recommendedActions: recommendedActions.length ? recommendedActions : fallback.insight.recommendedActions,
      urgencyGuidance: urgencyGuidance || fallback.insight.urgencyGuidance,
      disclaimer,
    };

    return {
      text: renderInsightText(insight),
      insight,
      usedFallback: false,
      validationIssues,
      model,
      promptVersion: INSIGHT_PROMPT_VERSION,
      aiRequestMs,
      timedOut,
    };
  } catch (err) {
    timedOut = err?.code === 'AI_TIMEOUT';
    console.error('AI INFERENCE ERROR:', err?.message || err);

    // Graceful fallback (system stays operational).
    return {
      text: fallback.text,
      insight: fallback.insight,
      usedFallback: true,
      validationIssues,
      model,
      promptVersion: INSIGHT_PROMPT_VERSION,
      aiRequestMs,
      timedOut,
    };
  } finally {
    if (timingEnabled && typeof aiRequestMs === 'number') {
      console.log(
        `[AI_TIMING] runHealthInference model=${model} promptVersion=${INSIGHT_PROMPT_VERSION} riskHint=${riskHint} language=${language} timeoutMs=${timeoutMs} timedOut=${timedOut} aiRequestMs=${aiRequestMs.toFixed(1)}`
      );
    }
  }
}

export async function runHealthInference(vitals, options = {}) {
  const result = await generateHealthInsight(vitals, options);
  return result.text;
}
