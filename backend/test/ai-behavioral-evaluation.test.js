import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.js';
import { aiClient } from '../src/services/ai/aiClient.js';
import {
  computeRiskLevel,
  generateHealthInsight,
} from '../src/services/ai/inference.service.js';
import { generateActivityInsight } from '../src/services/ai/activityInsight.service.js';
import { generateFallInsight } from '../src/services/ai/fallInsight.service.js';
import { generateSummaryInsight } from '../src/services/ai/summaryInsight.service.js';
import { generateTrendInsight } from '../src/services/ai/trendInsight.service.js';

const originalCreate = aiClient.chat.completions.create;

function setAiResponder(implementation) {
  aiClient.chat.completions.create = implementation;
}

function restoreAiResponder() {
  aiClient.chat.completions.create = originalCreate;
}

test.afterEach(() => {
  restoreAiResponder();
});

test('risk classifier enforces threshold boundaries exactly', () => {
  assert.equal(computeRiskLevel({ heartRate: 109 }), 'LOW');
  assert.equal(computeRiskLevel({ heartRate: 110 }), 'MODERATE');
  assert.equal(computeRiskLevel({ heartRate: 129 }), 'MODERATE');
  assert.equal(computeRiskLevel({ heartRate: 130 }), 'HIGH');
  assert.equal(computeRiskLevel({ heartRate: 139 }), 'HIGH');
  assert.equal(computeRiskLevel({ heartRate: 140 }), 'CRITICAL');
});

test('health insight falls back when model output is not JSON', async () => {
  setAiResponder(async () => ({
    choices: [{ message: { content: 'not-json-at-all' } }],
  }));

  const result = await generateHealthInsight({
    heartRate: 118,
    activity: 'MODERATE',
    fallDetected: false,
  });

  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.validationIssues, ['MODEL_OUTPUT_NOT_JSON']);
  assert.match(result.text, /AI analysis is temporarily unavailable/i);
});

test('health insight falls back when banned medical content appears', async () => {
  setAiResponder(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            riskLevel: 'HIGH',
            summary: 'Cardiovascular concern detected.',
            clinicalInterpretation: 'This suggests pneumonia and diabetes complications.',
            possibleContributingFactors: ['Fatigue', 'Dehydration'],
            recommendedActions: ['Rest', 'Monitor symptoms'],
            urgencyGuidance: 'Seek medical care if symptoms worsen.',
          }),
        },
      },
    ],
  }));

  const result = await generateHealthInsight({
    heartRate: 132,
    activity: 'HIGH',
    fallDetected: false,
  });

  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.validationIssues, ['BANNED_MEDICAL_CONTENT']);
  assert.match(result.text, /temporary service interruption/i);
});

test('health insight keeps the rule-based risk while recording model mismatch', async () => {
  setAiResponder(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            riskLevel: 'LOW',
            summary: 'Elevated reading detected.',
            clinicalInterpretation: 'This suggests physiological stress without naming any condition.',
            possibleContributingFactors: ['Stress', 'Fatigue'],
            recommendedActions: ['Rest', 'Monitor again later'],
            urgencyGuidance: 'Seek medical advice if symptoms worsen.',
          }),
        },
      },
    ],
  }));

  const result = await generateHealthInsight({
    heartRate: 145,
    activity: 'HIGH',
    fallDetected: true,
  });

  assert.equal(result.usedFallback, false);
  assert.equal(result.insight.riskLevel, 'CRITICAL');
  assert.deepEqual(result.validationIssues, ['RISK_LEVEL_MISMATCH']);
});

test('health insight times out into fallback mode', async () => {
  const previousTimeout = env.AI_ADVISORY_TIMEOUT_MS;
  env.AI_ADVISORY_TIMEOUT_MS = 1000;

  setAiResponder(
    () =>
      new Promise(() => {
        // Intentionally unresolved to exercise timeout fallback.
      })
  );

  try {
    const result = await generateHealthInsight({
      heartRate: 118,
      activity: 'MODERATE',
      fallDetected: false,
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.timedOut, true);
  } finally {
    env.AI_ADVISORY_TIMEOUT_MS = previousTimeout;
  }
});

test('activity insight fallback preserves disclaimer and computed activity level', async () => {
  setAiResponder(async () => {
    throw new Error('offline');
  });

  const output = await generateActivityInsight({
    steps: 8200,
    activeMinutes: 46,
    sedentaryMinutes: 220,
  });

  assert.match(output, /Activity Level:\s*HIGH/i);
  assert.match(output, /not a medical diagnosis/i);
});

test('fall insight fallback preserves computed fall status', async () => {
  setAiResponder(async () => {
    throw new Error('offline');
  });

  const output = await generateFallInsight({
    impactDetected: true,
    noMovementAfter: true,
    orientationChange: true,
  });

  assert.match(output, /Fall Status:\s*CONFIRMED FALL/i);
  assert.match(output, /does not diagnose injuries/i);
});

test('summary insight fallback respects Filipino language', async () => {
  setAiResponder(async () => {
    throw new Error('offline');
  });

  const output = await generateSummaryInsight(
    {
      period: 'weekly',
      overallRisk: 'moderate',
      trend: 'stable',
      fallEvents: 0,
      observations: ['Stable heart-rate readings this week'],
    },
    { language: 'fil' }
  );

  assert.match(output, /Pansamantalang unavailable ang AI summary/i);
  assert.match(output, /Walang naitalang fall event/i);
});

test('trend insight fallback includes measured values', async () => {
  setAiResponder(async () => {
    throw new Error('offline');
  });

  const output = await generateTrendInsight(
    {
      trend: 'INCREASING',
      baseline: 78,
      recentHeartRates: [78, 84, 91],
    },
    { language: 'en' }
  );

  assert.match(output, /Trend Status:\s*INCREASING/i);
  assert.match(output, /Recent Samples:\s*78, 84, 91/i);
});
