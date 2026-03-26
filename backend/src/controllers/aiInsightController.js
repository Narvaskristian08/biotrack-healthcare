import AiInsight from '../models/AiInsight.js';
import { resolveInsightPatientId } from '../services/ai/subjectResolver.service.js';

export async function listAiInsights(req, res, next) {
  try {
    const userId = await resolveInsightPatientId(req, { source: 'query', field: 'patientId' });
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

    const insights = await AiInsight.find({
      healthCenterId: req.context.healthCenterId,
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      insights: insights.map((insight) => ({
        id: insight._id,
        healthRecordId: insight.healthRecordId,
        riskLevel: insight.riskLevel,
        language: insight.language,
        text: insight.text,
        usedFallback: insight.usedFallback,
        model: insight.model,
        validationIssues: insight.validationIssues ?? [],
        createdAt: insight.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

