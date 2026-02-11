import { buildHealthSummary } from '../services/summaryAnalysis.service.js';
import { generateSummaryInsight } from '../services/ai/summaryInsight.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';

export async function getHealthSummary(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });
    const days = Number(req.query.days ?? 7);

    const summaryData = await buildHealthSummary(userId, days, req.context.healthCenterId);
    const insight = await generateSummaryInsight(summaryData);

    res.json({
      success: true,
      summaryData,
      insight,
    });
  } catch (err) {
    next(err);
  }
}
