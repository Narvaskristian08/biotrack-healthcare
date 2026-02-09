import { analyzeUserTrend } from '../services/trendAnalysis.service.js';
import { generateTrendInsight } from '../services/ai/trendInsight.service.js';

export async function getTrendInsight(req, res, next) {
  try {
    const userId = req.context.user.id; // from auth context

    const trendData = await analyzeUserTrend(userId);
    const insight = await generateTrendInsight(trendData);

    res.json({
      success: true,
      insight,
    });
  } catch (err) {
    next(err);
  }
}
