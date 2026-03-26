import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Health Alert Explanation Assistant.

ROLE:
- Explain why a health alert was triggered.
- Provide calm, clear guidance.
- You do NOT diagnose medical conditions.

OUTPUT FORMAT:

Health Alert

Alert Type:
<type>

Severity:
<severity>

Explanation:
<why this alert occurred>

Recommended Action:
<what the user should do>

This alert is informational and not a medical diagnosis.
`;

function buildAlertFallback(alert = {}) {
  const type = String(alert?.type ?? 'unknown').toUpperCase();
  const severity = String(alert?.severity ?? 'unknown').toUpperCase();
  const message = String(alert?.message ?? '').trim();

  return [
    'Health Alert',
    '',
    `Alert Type: ${type}`,
    `Severity: ${severity}`,
    '',
    'Explanation:',
    message || 'An alert was recorded based on recent monitoring data.',
    '',
    'Recommended Action:',
    '- Review recent vitals and symptoms',
    '- Continue monitoring',
    '- Contact a healthcare professional if the issue persists',
    '',
    'AI explanation is temporarily unavailable. This alert remains informational and not diagnostic.',
  ].join('\n');
}

export async function generateAlertInsight(alert = {}) {
  try {
    const response = await aiClient.chat.completions.create({
      model: 'meta-llama/llama-3-8b-instruct',
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(alert, null, 2),
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content;
    }
  } catch (err) {
    // Keep endpoint available even when AI provider credentials are missing or invalid.
    console.error('ALERT INSIGHT AI ERROR:', err?.message || err);
  }

  return buildAlertFallback(alert);
}
