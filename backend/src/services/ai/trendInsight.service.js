import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Health Trend Interpretation Assistant.

ROLE:
- Interpret health trends over time.
- Explain whether the trend is improving, worsening, or stable.
- You do NOT diagnose diseases.

OUTPUT FORMAT (STRICT):

Health Trend Insight

Trend Status:
<INCREASING | DECREASING | STABLE | INSUFFICIENT DATA>

Observation:
<what changed over time>

Interpretation:
<what this trend suggests in general terms>

Recommended Action:
<monitoring or lifestyle guidance>

Trend analysis is observational and not diagnostic.
`;

function buildTrendFallback(trendData = {}) {
  const trend = String(trendData?.trend ?? 'INSUFFICIENT_DATA').toUpperCase();
  const baselineValue = Number(trendData?.baseline);
  const baseline = Number.isFinite(baselineValue) ? baselineValue : null;
  const recentSamples = Array.isArray(trendData?.recentHeartRates)
    ? trendData.recentHeartRates.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value))
    : [];

  const latestSample = recentSamples.length > 0 ? recentSamples[recentSamples.length - 1] : null;
  const sampleSummary = recentSamples.length > 0 ? recentSamples.join(', ') : 'none';

  return [
    'Health Trend Insight',
    '',
    `Trend Status: ${trend}`,
    `Baseline Heart Rate: ${baseline ?? 'N/A'}`,
    `Latest Heart Rate: ${latestSample ?? 'N/A'}`,
    `Recent Samples: ${sampleSummary}`,
    '',
    'Interpretation:',
    'AI explanation is temporarily unavailable, so this summary uses measured trend values only.',
    '',
    'Recommended Action:',
    '- Continue regular monitoring',
    '- Compare changes over time',
    '- Seek medical advice if symptoms worsen',
    '',
    'This trend analysis is observational and not a medical diagnosis.',
  ].join('\n');
}

export async function generateTrendInsight(trendData = {}) {
  const recentHeartRates = Array.isArray(trendData?.recentHeartRates) ? trendData.recentHeartRates : [];

  try {
    const response = await aiClient.chat.completions.create({
      model: 'meta-llama/llama-3-8b-instruct',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `
Trend: ${trendData?.trend ?? 'INSUFFICIENT_DATA'}
Baseline heart rate: ${trendData?.baseline ?? 'N/A'}
Recent heart rates: ${recentHeartRates.join(', ') || 'none'}
          `,
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content;
    }
  } catch (err) {
    // Keep endpoint available even when AI provider credentials are missing or invalid.
    console.error('TREND INSIGHT AI ERROR:', err?.message || err);
  }

  return buildTrendFallback({ ...trendData, recentHeartRates });
}
