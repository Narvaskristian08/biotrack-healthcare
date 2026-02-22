import { aiClient } from './aiClient.js';

const SYSTEM_PROMPT = `
You are an AI Health Summary Assistant.

ROLE:
- Summarize multiple health insights into a clear overview.
- You do NOT diagnose medical conditions.
- Use simple, user-friendly language.

OUTPUT FORMAT (STRICT):

Health Summary Report

Period:
<Daily | Weekly>

Overall Risk Level:
<LOW | MODERATE | HIGH>

Key Observations:
- <observation 1>
- <observation 2>
- <observation 3>

Trend Overview:
<INCREASING | STABLE | DECREASING | INSUFFICIENT DATA>

Safety Events:
<Fall detected | No fall events detected>

Recommended Focus:
<general guidance>

This summary is informational and not a medical diagnosis.
`;

function buildSummaryFallback(summaryData = {}) {
  const period = String(summaryData?.period ?? 'weekly');
  const overallRisk = String(summaryData?.overallRisk ?? 'UNKNOWN').toUpperCase();
  const trend = String(summaryData?.trend ?? 'INSUFFICIENT_DATA').toUpperCase();
  const fallEventsValue = Number(summaryData?.fallEvents);
  const fallEvents = Number.isFinite(fallEventsValue) ? fallEventsValue : 0;
  const observations = Array.isArray(summaryData?.observations)
    ? summaryData.observations.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    : [];

  const observationLines = observations.length > 0
    ? observations.map((entry) => `- ${entry}`)
    : ['- No notable observations recorded for this period.'];

  return [
    'Health Summary Report',
    '',
    `Period: ${period}`,
    `Overall Risk Level: ${overallRisk}`,
    `Trend Overview: ${trend}`,
    `Safety Events: ${fallEvents > 0 ? `${fallEvents} fall-related event(s)` : 'No fall events detected'}`,
    '',
    'Key Observations:',
    ...observationLines,
    '',
    'Recommended Focus:',
    '- Continue routine monitoring',
    '- Follow current care and safety plan',
    '- Seek professional guidance if symptoms worsen',
    '',
    'AI summary is temporarily unavailable. This report is generated from existing monitored data.',
  ].join('\n');
}

export async function generateSummaryInsight(summaryData = {}) {
  try {
    const response = await aiClient.chat.completions.create({
      model: 'meta-llama/llama-3-8b-instruct',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(summaryData, null, 2),
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content;
    }
  } catch (err) {
    // Keep endpoint available even when AI provider credentials are missing or invalid.
    console.error('SUMMARY INSIGHT AI ERROR:', err?.message || err);
  }

  return buildSummaryFallback(summaryData);
}
