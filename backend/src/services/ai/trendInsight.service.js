import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Health Trend Interpretation Assistant.

ROLE:
- Interpret health trends over time.
- Explain whether the trend is improving, worsening, or stable.
- You do NOT diagnose diseases.

OUTPUT FORMAT (STRICT):

📈 Health Trend Insight

Trend Status:
<INCREASING | DECREASING | STABLE | INSUFFICIENT DATA>

Observation:
<what changed over time>

Interpretation:
<what this trend suggests in general terms>

Recommended Action:
<monitoring or lifestyle guidance>

⚠️ Trend analysis is observational and not diagnostic.
`;

export async function generateTrendInsight(trendData) {
  const response = await aiClient.chat.completions.create({
    model: 'meta-llama/llama-3-8b-instruct',
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `
Trend: ${trendData.trend}
Baseline heart rate: ${trendData.baseline}
Recent heart rates: ${trendData.recentHeartRates.join(', ')}
        `,
      },
    ],
  });

  return response.choices[0].message.content;
}
