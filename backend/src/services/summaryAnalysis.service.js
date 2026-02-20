import HealthRecord from '../models/HealthRecord.js';
import { resolveHealthTelemetry } from './healthTelemetryEncryption.service.js';
import { computeTrend } from './trendAnalysis.service.js';

export async function buildHealthSummary(userId, days = 7, healthCenterId = null) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const query = {
    userId,
    createdAt: { $gte: since },
  };
  if (healthCenterId) query.healthCenterId = healthCenterId;

  const records = await HealthRecord.find(query);

  if (!records.length) {
    return {
      period: days === 1 ? 'Daily' : 'Weekly',
      overallRisk: 'LOW',
      observations: ['No sufficient data available'],
      trend: 'INSUFFICIENT DATA',
      fallEvents: 0,
    };
  }

  const riskCounts = {};
  let fallEvents = 0;
  const heartRates = [];

  records.forEach((record) => {
    const telemetry = resolveHealthTelemetry(record, {
      healthCenterId,
      userId,
    });
    const risk = String(record.riskLevel ?? '').toUpperCase();
    if (['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(risk)) {
      riskCounts[risk] = (riskCounts[risk] || 0) + 1;
    }

    if (telemetry.fallDetected) {
      fallEvents++;
    }

    const hr = Number(telemetry.heartRate);
    if (Number.isFinite(hr)) heartRates.push(hr);
  });

  const [mostFrequentRisk] =
    Object.entries(riskCounts).sort((a, b) => b[1] - a[1])[0] ?? ['LOW'];
  const { trend } = computeTrend(heartRates);

  return {
    period: days === 1 ? 'Daily' : 'Weekly',
    overallRisk: mostFrequentRisk,
    observations: [
      `${records.length} health records analyzed`,
      `Most frequent risk level: ${mostFrequentRisk}`,
    ],
    trend,
    fallEvents,
  };
}
