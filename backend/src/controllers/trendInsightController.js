import { analyzeTrendComparison, analyzeUserTrend } from '../services/trendAnalysis.service.js';
import { generateTrendInsight } from '../services/ai/trendInsight.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';
import { normalizeAiLanguage } from '../services/ai/language.service.js';

export async function getTrendInsight(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });
    const language = normalizeAiLanguage(req.query?.language, 'en');

    const trendData = await analyzeUserTrend(userId, req.context.healthCenterId);
    const insight = await generateTrendInsight(trendData, { language });

    res.json({
      success: true,
      trendData,
      insight,
      language,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTrendComparison(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });
    const currentDays = Number(req.query?.currentDays ?? 7);
    const previousDays = Number(req.query?.previousDays ?? 7);

    const comparison = await analyzeTrendComparison(userId, {
      healthCenterId: req.context.healthCenterId,
      currentDays,
      previousDays,
    });

    res.json({
      success: true,
      comparison,
    });
  } catch (err) {
    next(err);
  }
}
