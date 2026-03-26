import HealthRecord from '../models/HealthRecord.js';
import { resolveHealthTelemetry } from './healthTelemetryEncryption.service.js';

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
    .map((record) => {
      const telemetry = resolveHealthTelemetry(record, {
        healthCenterId,
        userId,
      });
      return Number(telemetry.heartRate);
    })
    .filter(n => Number.isFinite(n));

  const { trend, baseline } = computeTrend(heartRates);

  return {
    trend,
    baseline,
    recentHeartRates: heartRates,
  };
}

function roundToOne(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function buildWindowSummary(heartRates = []) {
  if (!Array.isArray(heartRates) || heartRates.length === 0) {
    return {
      sampleCount: 0,
      averageHeartRate: null,
      minHeartRate: null,
      maxHeartRate: null,
      trend: 'INSUFFICIENT_DATA',
    };
  }

  const average = heartRates.reduce((total, value) => total + value, 0) / heartRates.length;
  const { trend } = computeTrend(heartRates);

  return {
    sampleCount: heartRates.length,
    averageHeartRate: roundToOne(average),
    minHeartRate: Math.min(...heartRates),
    maxHeartRate: Math.max(...heartRates),
    trend,
  };
}

export async function analyzeTrendComparison(
  userId,
  {
    healthCenterId = null,
    currentDays = 7,
    previousDays = 7,
  } = {}
) {
  const currentWindowDays = Math.max(1, Number(currentDays) || 7);
  const previousWindowDays = Math.max(1, Number(previousDays) || 7);
  const nowMs = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const currentStartMs = nowMs - currentWindowDays * oneDayMs;
  const previousStartMs = currentStartMs - previousWindowDays * oneDayMs;

  const query = {
    userId,
    createdAt: { $gte: new Date(previousStartMs) },
  };
  if (healthCenterId) query.healthCenterId = healthCenterId;

  const records = await HealthRecord.find(query).sort({ createdAt: 1 });
  const currentHeartRates = [];
  const previousHeartRates = [];

  records.forEach((record) => {
    const telemetry = resolveHealthTelemetry(record, {
      healthCenterId,
      userId,
    });
    const heartRate = Number(telemetry.heartRate);
    if (!Number.isFinite(heartRate)) return;

    const createdAtMs = new Date(record.createdAt).getTime();
    if (createdAtMs >= currentStartMs) {
      currentHeartRates.push(heartRate);
      return;
    }
    if (createdAtMs >= previousStartMs) {
      previousHeartRates.push(heartRate);
    }
  });

  const currentWindow = {
    days: currentWindowDays,
    ...buildWindowSummary(currentHeartRates),
  };
  const previousWindow = {
    days: previousWindowDays,
    ...buildWindowSummary(previousHeartRates),
  };

  const currentAvg = Number(currentWindow.averageHeartRate);
  const previousAvg = Number(previousWindow.averageHeartRate);
  const hasComparableAverages = Number.isFinite(currentAvg) && Number.isFinite(previousAvg);
  const deltaBpm = hasComparableAverages ? roundToOne(currentAvg - previousAvg) : null;
  const deltaPercent = hasComparableAverages && previousAvg !== 0
    ? roundToOne(((currentAvg - previousAvg) / previousAvg) * 100)
    : null;

  let direction = 'insufficient_data';
  if (hasComparableAverages) {
    if (Math.abs(currentAvg - previousAvg) < 1) direction = 'flat';
    else direction = currentAvg > previousAvg ? 'higher' : 'lower';
  }

  return {
    currentWindow,
    previousWindow,
    deltaBpm,
    deltaPercent,
    direction,
  };
}
