import { analyzeUserTrend } from '../services/trendAnalysis.service.js';
import { generateTrendInsight } from '../services/ai/trendInsight.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';

export async function getTrendInsight(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });

    const trendData = await analyzeUserTrend(userId, req.context.healthCenterId);
    const insight = await generateTrendInsight(trendData);

    res.json({
      success: true,
      trendData,
      insight,
    });
  } catch (err) {
    next(err);
  }
}
