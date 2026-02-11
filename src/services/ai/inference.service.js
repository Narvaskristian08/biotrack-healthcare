import { aiClient } from './aiClient.js';

/**
 * SYSTEM PROMPT
 * Forces the AI to act as a clinical decision support system,
 * NOT a diagnostic system.
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

OUTPUT FORMAT (STRICT — FOLLOW EXACTLY):

📊 AI Health Insight

Risk Level:
<LOW | MODERATE | HIGH | CRITICAL>

Summary:
<one sentence summary>

Clinical Interpretation:
<2–3 sentences explaining why this risk level was assigned>

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

⚠️ This system does not diagnose medical conditions. It provides risk assessment and decision support only.
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

/**
 * Main AI inference function
 */
export async function runHealthInference(vitals) {
  const riskHint = computeRiskLevel(vitals);

  try {
    const response = await aiClient.chat.completions.create({
      model: 'meta-llama/llama-3-8b-instruct',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
User state: resting

Heart rate: ${vitals.heartRate}
Activity level: ${vitals.activity}
Fall detected: ${vitals.fallDetected}
Age range: ${vitals.ageRange}

System pre-assessed risk level: ${riskHint}
          `,
        },
      ],
    });

    let output = response.choices[0].message.content?.trim() ?? '';

    // Backend safety enforcement (disclaimer guarantee)
    if (!output.includes('⚠️')) {
      output +=
        '\n\n⚠️ This system does not diagnose medical conditions. It provides risk assessment and decision support only.';
    }

    return output;
  } catch (err) {
    console.error('AI INFERENCE ERROR:', err?.message || err);

    // Graceful fallback (system stays operational)
    return `
📊 AI Health Insight

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

⚠️ This system does not diagnose medical conditions. It provides risk assessment and decision support only.
    `.trim();
  }
}
