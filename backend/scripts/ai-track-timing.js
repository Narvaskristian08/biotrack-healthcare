/**
 * AI Track helper: run `runHealthInference` 5 times with different inputs
 * and print timing logs (enabled via AI_TIMING_LOGS).
 *
 * Run:
 *   npm --workspace backend run ai:timing
 */

process.env.AI_TIMING_LOGS ??= 'true';

async function main() {
  const { computeRiskLevel, runHealthInference } = await import(
    '../src/services/ai/inference.service.js'
  );

  const testCases = [
    {
      name: 'Case 1 (baseline)',
      vitals: { heartRate: 78, activity: 'LOW', fallDetected: false, ageRange: '18-25' },
    },
    {
      name: 'Case 2 (elevated)',
      vitals: { heartRate: 118, activity: 'MODERATE', fallDetected: false, ageRange: '26-35' },
    },
    {
      name: 'Case 3 (post-exertion)',
      vitals: { heartRate: 104, activity: 'HIGH', fallDetected: false, ageRange: '36-50' },
    },
    {
      name: 'Case 4 (critical)',
      vitals: { heartRate: 146, activity: 'HIGH', fallDetected: true, ageRange: '66+' },
    },
    {
      name: 'Case 5 (low-risk older)',
      vitals: { heartRate: 72, activity: 'LOW', fallDetected: false, ageRange: '66+' },
    },
  ];

  for (const testCase of testCases) {
    const riskHint = computeRiskLevel(testCase.vitals);
    console.log(`\n${testCase.name}`);
    console.log(
      `Input: heartRate=${testCase.vitals.heartRate}, activity=${testCase.vitals.activity}, fallDetected=${testCase.vitals.fallDetected}, ageRange=${testCase.vitals.ageRange}, riskHint=${riskHint}`
    );

    const output = await runHealthInference(testCase.vitals);
    console.log(`Output chars: ${String(output ?? '').length}`);
  }
}

main().catch((err) => {
  console.error('AI timing runner failed:', err?.message || err);
  process.exitCode = 1;
});
