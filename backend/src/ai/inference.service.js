import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are a health advisory assistant.
You do NOT provide medical diagnosis.
You only give preventive and wellness advice.
Always include a disclaimer.
`;

export async function runHealthInference(vitals) {
  const response = await aiClient.chat.completions.create({
    model: 'gpt-4o-mini', // later replaced with fine-tuned model
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
  role: 'user',
  content: `
Heart rate: ${vitals.heartRate}
Activity level: ${vitals.activity}
Fall detected: ${vitals.fallDetected}
User state: resting
Age range: ${vitals.ageRange}
`
}

    ],
  });

  return response.choices[0].message.content;
}
