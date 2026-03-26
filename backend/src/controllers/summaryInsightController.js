import { buildHealthSummary } from '../services/summaryAnalysis.service.js';
import { generateSummaryInsight } from '../services/ai/summaryInsight.service.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';
import { normalizeAiLanguage } from '../services/ai/language.service.js';

export async function getHealthSummary(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });
    const days = Number(req.query.days ?? 7);
    const language = normalizeAiLanguage(req.query?.language, 'en');
    const includeInsight = req.query?.includeInsight !== undefined ? Boolean(req.query.includeInsight) : true;

    const summaryData = await buildHealthSummary(userId, days, req.context.healthCenterId);
    const insight = includeInsight ? await generateSummaryInsight(summaryData, { language }) : '';

    res.json({
      success: true,
      summaryData,
      insight,
      language,
      includeInsight,
    });
  } catch (err) {
    next(err);
  }
}
