import HealthRecord from '../models/HealthRecord.js';

function computeTrend(records) {
  if (records.length < 3) {
    return {
      trend: 'INSUFFICIENT_DATA',
      baseline: null,
    };
  }

  const heartRates = records.map(r => r.heartRate);
  const baseline =
    heartRates.slice(0, Math.floor(heartRates.length / 2))
      .reduce((a, b) => a + b, 0) /
    Math.floor(heartRates.length / 2);

  const recentAvg =
    heartRates.slice(-3).reduce((a, b) => a + b, 0) / 3;

  if (recentAvg > baseline + 10) return { trend: 'INCREASING', baseline };
  if (recentAvg < baseline - 10) return { trend: 'DECREASING', baseline };

  return { trend: 'STABLE', baseline };
}

export async function analyzeUserTrend(userId) {
  const records = await HealthRecord.find({ userId })
    .sort({ createdAt: 1 })
    .limit(10);

  const { trend, baseline } = computeTrend(records);

  return {
    trend,
    baseline,
    recentHeartRates: records.map(r => r.heartRate),
  };
}
