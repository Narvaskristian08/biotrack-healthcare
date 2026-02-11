import Alert from '../models/Alert.js';
import { generateAlertInsight } from '../services/ai/alertInsight.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';

export async function getAlerts(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });
    const includeInsights = String(req.query.includeInsights ?? 'false').toLowerCase() === 'true';
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

    const alerts = await Alert.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    const data = includeInsights
      ? await Promise.all(
        alerts.map(async alert => ({
          ...alert,
          insight: await generateAlertInsight(alert),
        }))
      )
      : alerts;

    res.json({
      success: true,
      alerts: data,
    });
  } catch (err) {
    next(err);
  }
}
