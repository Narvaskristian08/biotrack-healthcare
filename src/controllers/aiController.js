import HealthRecord from '../models/HealthRecord.js';
import { evaluateAlerts } from '../services/alertEngine.service.js';
import { computeRiskLevel, runHealthInference } from '../services/ai/inference.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';
import { analyzeUserTrend } from '../services/trendAnalysis.service.js';

function httpError(statusCode, message, code = 'REQUEST_INVALID') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return Boolean(value);
}

function normalizeActivityLevel(activity) {
  if (typeof activity === 'string') {
    const normalized = activity.trim().toUpperCase();
    if (['LOW', 'MODERATE', 'HIGH'].includes(normalized)) return normalized;
  }

  const numeric = toNumberOrNull(activity);
  if (numeric === null) return 'LOW';
  if (numeric >= 8000) return 'HIGH';
  if (numeric >= 3000) return 'MODERATE';
  return 'LOW';
}

export async function analyzeVitals(req, res, next) {
  try {
    const vitals = req.body ?? {};
    const patientId = await resolveInsightPatientId(req, { source: 'body', field: 'patientId' });
    const heartRate = toNumberOrNull(vitals.heartRate);
    if (heartRate === null || heartRate <= 0) {
      throw httpError(400, 'heartRate must be a positive number', 'HEART_RATE_INVALID');
    }

    const normalizedVitals = {
      ...vitals,
      heartRate,
      fallDetected: toBoolean(vitals.fallDetected),
    };

    const aiResult = await runHealthInference(normalizedVitals);
    const riskLevel = computeRiskLevel(normalizedVitals);

    const previous = await HealthRecord.findOne({
      healthCenterId: req.context.healthCenterId,
      userId: patientId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const record = await HealthRecord.create({
      healthCenterId: req.context.healthCenterId,
      userId: patientId,
      heartRate,
      activityLevel: normalizeActivityLevel(vitals.activity),
      riskLevel,
      fallDetected: normalizedVitals.fallDetected,
    });

    const trendData = await analyzeUserTrend(patientId, req.context.healthCenterId);
    const alerts = await evaluateAlerts({
      userId: patientId,
      currentRisk: riskLevel,
      previousRisk: previous?.riskLevel ?? null,
      fallDetected: normalizedVitals.fallDetected,
      trend: trendData.trend,
    });

    res.json({
      success: true,
      aiResult,
      record: {
        id: record._id,
        userId: record.userId,
        riskLevel: record.riskLevel,
      },
      trend: trendData.trend,
      alerts,
    });
  } catch (err) {
    next(err);
  }
}
