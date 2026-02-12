import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Health Alert Explanation Assistant.

ROLE:
- Explain why a health alert was triggered.
- Provide calm, clear guidance.
- You do NOT diagnose medical conditions.

OUTPUT FORMAT:

🔔 Health Alert

Alert Type:
<type>

Severity:
<severity>

Explanation:
<why this alert occurred>

Recommended Action:
<what the user should do>

⚠️ This alert is informational and not a medical diagnosis.
`;

export async function generateAlertInsight(alert) {
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

  return response.choices[0].message.content;
}
