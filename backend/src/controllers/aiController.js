import HealthRecord from '../models/HealthRecord.js';
import Alert from '../models/Alert.js';
import AiInsight from '../models/AiInsight.js';
import { evaluateAlerts } from '../services/alertEngine.service.js';
import { computeRiskLevel, generateHealthInsight } from '../services/ai/inference.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';
import { encryptHealthTelemetryForStorage } from '../services/healthTelemetryEncryption.service.js';
import { analyzeUserTrend } from '../services/trendAnalysis.service.js';
import { writeAuditLog } from '../services/auditService.js';
import { normalizeAiLanguage } from '../services/ai/language.service.js';

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
    const language = normalizeAiLanguage(vitals.language, 'en');
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

    const riskLevel = computeRiskLevel(normalizedVitals);
    const activityLevel = normalizeActivityLevel(vitals.activity);
    normalizedVitals.activityLevel = activityLevel;

    const previous = await HealthRecord.findOne({
      healthCenterId: req.context.healthCenterId,
      userId: patientId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const record = await HealthRecord.create({
      healthCenterId: req.context.healthCenterId,
      userId: patientId,
      telemetry: encryptHealthTelemetryForStorage(
        {
          heartRate,
          activityLevel,
          fallDetected: normalizedVitals.fallDetected,
        },
        { healthCenterId: req.context.healthCenterId, userId: patientId }
      ),
      riskLevel,
    });

    const trendData = await analyzeUserTrend(patientId, req.context.healthCenterId);
    const alerts = await evaluateAlerts({
      userId: patientId,
      currentRisk: riskLevel,
      previousRisk: previous?.riskLevel ?? null,
      fallDetected: normalizedVitals.fallDetected,
      trend: trendData.trend,
    });

    const insightResult = await generateHealthInsight(normalizedVitals, {
      language,
      riskHint: riskLevel,
      context: {
        previousRiskLevel: previous?.riskLevel ?? null,
        trendData,
        alerts,
      },
    });

    const aiResult = insightResult.text;
    let insightId = null;

    try {
      const stored = await AiInsight.create({
        healthCenterId: req.context.healthCenterId,
        userId: patientId,
        healthRecordId: record._id,
        language,
        riskLevel,
        provider: 'openrouter',
        model: insightResult.model,
        promptVersion: insightResult.promptVersion,
        usedFallback: Boolean(insightResult.usedFallback),
        timedOut: Boolean(insightResult.timedOut),
        aiRequestMs: typeof insightResult.aiRequestMs === 'number' ? insightResult.aiRequestMs : null,
        validationIssues: Array.isArray(insightResult.validationIssues) ? insightResult.validationIssues : [],
        inputContext: {
          heartRate,
          activityInput: vitals.activity ?? null,
          activityLevel,
          fallDetected: normalizedVitals.fallDetected,
          ageRange: vitals.ageRange ?? null,
          signalQuality: vitals.signalQuality ?? null,
          fingerDetected: vitals.fingerDetected ?? null,
          movementIntensity: vitals.movementIntensity ?? null,
          previousRiskLevel: previous?.riskLevel ?? null,
          trendData,
          alerts: (alerts ?? []).map((alert) => ({
            type: alert?.type ?? null,
            severity: alert?.severity ?? null,
          })),
        },
        output: insightResult.insight ?? null,
        text: aiResult,
      });

      insightId = stored?._id ?? null;
    } catch (err) {
      console.error('AI INSIGHT SAVE ERROR:', err?.message || err);
    }

    res.json({
      success: true,
      aiResult,
      language,
      insightId,
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

export async function clearMyMonitoringHistory(req, res, next) {
  try {
    const patientId = String(req.context?.patientId ?? '').trim();
    const healthCenterId = String(req.context?.healthCenterId ?? '').trim();
    if (!patientId || !healthCenterId) {
      return res.status(401).json({ error: { message: 'Patient session context is required' } });
    }

    const [healthRecordResult, alertResult, insightResult] = await Promise.all([
      HealthRecord.deleteMany({ userId: patientId, healthCenterId }),
      Alert.deleteMany({ userId: patientId }),
      AiInsight.deleteMany({ userId: patientId, healthCenterId }),
    ]);

    await writeAuditLog({
      req,
      action: 'PATIENT.MONITORING_HISTORY.CLEAR',
      entityType: 'Patient',
      entityId: patientId,
      after: {
        deletedHealthRecords: Number(healthRecordResult?.deletedCount ?? 0),
        deletedAlerts: Number(alertResult?.deletedCount ?? 0),
        deletedAiInsights: Number(insightResult?.deletedCount ?? 0),
      },
    });

    return res.json({
      success: true,
      message: 'Monitoring history cleared.',
      deleted: {
        healthRecords: Number(healthRecordResult?.deletedCount ?? 0),
        alerts: Number(alertResult?.deletedCount ?? 0),
        aiInsights: Number(insightResult?.deletedCount ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
}
