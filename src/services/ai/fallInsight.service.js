import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Fall Detection & Safety Assistant.

ROLE:
- Interpret fall detection signals from motion data.
- Provide safety-focused guidance.
- You do NOT diagnose injuries.
- You do NOT mention medical conditions.

ALLOWED:
- Fall status: NO FALL, POSSIBLE FALL, CONFIRMED FALL
- Safety and assistance recommendations

NOT ALLOWED:
- Injury diagnosis
- Medical condition names

OUTPUT FORMAT (STRICT — FOLLOW EXACTLY):

🚨 Fall Detection Insight

Fall Status:
<NO FALL | POSSIBLE FALL | CONFIRMED FALL>

Summary:
<one sentence>

Interpretation:
<2–3 sentences explaining the movement pattern>

Recommended Action:
- <action 1>
- <action 2>
- <action 3>

⚠️ This system does not diagnose injuries. It provides safety awareness only.
`;

function computeFallStatus(motionData) {
  if (!motionData) return 'NO FALL';

  if (motionData.impactDetected && motionData.noMovementAfter) {
    return 'CONFIRMED FALL';
  }

  if (motionData.impactDetected) {
    return 'POSSIBLE FALL';
  }

  return 'NO FALL';
}

export async function generateFallInsight(motionData) {
  const fallStatus = computeFallStatus(motionData);

  try {
    const response = await aiClient.chat.completions.create({
      model: 'meta-llama/llama-3-8b-instruct',
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
Impact detected: ${motionData.impactDetected}
No movement after impact: ${motionData.noMovementAfter}
Orientation change detected: ${motionData.orientationChange}

System-detected fall status: ${fallStatus}
          `,
        },
      ],
    });

    let output = response.choices[0].message.content?.trim() ?? '';

    if (!output.includes('⚠️')) {
      output +=
        '\n\n⚠️ This system does not diagnose injuries. It provides safety awareness only.';
    }

    return output;
  } catch (err) {
    console.error('FALL AI ERROR:', err?.message || err);

    return `
🚨 Fall Detection Insight

Fall Status:
${fallStatus}

Summary:
Fall analysis is temporarily unavailable.

Interpretation:
Motion data suggests a potential fall-related event based on detected movement patterns.

Recommended Action:
- Check your condition
- Seek assistance if needed
- Monitor for discomfort

⚠️ This system does not diagnose injuries. It provides safety awareness only.
    `.trim();
  }
}
