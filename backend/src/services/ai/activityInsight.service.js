import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Activity & Movement Insight Assistant.

ROLE:
- Analyze user activity and movement levels.
- Provide lifestyle and wellness insights.
- You do NOT diagnose medical conditions.
- You do NOT mention diseases or injuries.

ALLOWED:
- Activity levels: LOW, MODERATE, HIGH
- Lifestyle-related explanations
- General wellness advice

NOT ALLOWED:
- Diagnoses
- Medical condition names
- Clinical claims

OUTPUT FORMAT (STRICT — FOLLOW EXACTLY):

🏃 Activity & Movement Insight

Activity Level:
<LOW | MODERATE | HIGH>

Summary:
<one sentence>

Interpretation:
<2–3 sentences explaining the activity level>

Recommendations:
- <recommendation 1>
- <recommendation 2>
- <recommendation 3>

⚠️ This insight is for general health awareness only and is not a medical diagnosis.
`;

function computeActivityLevel(activityData) {
  if (!activityData?.steps) return 'LOW';

  if (activityData.steps >= 8000) return 'HIGH';
  if (activityData.steps >= 3000) return 'MODERATE';

  return 'LOW';
}

export async function generateActivityInsight(activityData) {
  const activityLevel = computeActivityLevel(activityData);

  try {
    const response = await aiClient.chat.completions.create({
      model: 'meta-llama/llama-3-8b-instruct',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
Daily steps: ${activityData.steps}
Active minutes: ${activityData.activeMinutes}
Sedentary time (minutes): ${activityData.sedentaryMinutes}

System-detected activity level: ${activityLevel}
          `,
        },
      ],
    });

    let output = response.choices[0].message.content?.trim() ?? '';

    // Safety enforcement
    if (!output.includes('⚠️')) {
      output +=
        '\n\n⚠️ This insight is for general health awareness only and is not a medical diagnosis.';
    }

    return output;
  } catch (err) {
    console.error('ACTIVITY AI ERROR:', err?.message || err);

    return `
🏃 Activity & Movement Insight

Activity Level:
${activityLevel}

Summary:
Activity insight is temporarily unavailable.

Interpretation:
The system could not complete AI analysis at this time. A baseline activity level was estimated using movement data.

Recommendations:
- Engage in light movement when possible
- Avoid prolonged sedentary periods
- Reassess activity later

⚠️ This insight is for general health awareness only and is not a medical diagnosis.
    `.trim();
  }
}
