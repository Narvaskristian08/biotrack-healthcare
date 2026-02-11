import HealthRecord from '../models/HealthRecord.js';

export function computeTrend(heartRates) {
  if (heartRates.length < 3) {
    return {
      trend: 'INSUFFICIENT_DATA',
      baseline: null,
    };
  }

  const midpoint = Math.max(1, Math.floor(heartRates.length / 2));
  const baseline =
    heartRates.slice(0, midpoint)
      .reduce((a, b) => a + b, 0) /
    midpoint;

  const recentAvg =
    heartRates.slice(-3).reduce((a, b) => a + b, 0) / 3;

  if (recentAvg > baseline + 10) return { trend: 'INCREASING', baseline };
  if (recentAvg < baseline - 10) return { trend: 'DECREASING', baseline };

  return { trend: 'STABLE', baseline };
}

export async function analyzeUserTrend(userId, healthCenterId = null) {
  const query = { userId };
  if (healthCenterId) query.healthCenterId = healthCenterId;

  const records = await HealthRecord.find(query)
    .sort({ createdAt: 1 })
    .limit(10);

  const heartRates = records
    .map(r => Number(r.heartRate))
    .filter(n => Number.isFinite(n));

  const { trend, baseline } = computeTrend(heartRates);

  return {
    trend,
    baseline,
    recentHeartRates: heartRates,
  };
}
