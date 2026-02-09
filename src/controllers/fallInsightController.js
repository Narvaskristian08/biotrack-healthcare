import { generateFallInsight } from '../services/ai/fallInsight.service.js';

export async function getFallInsight(req, res, next) {
  try {
    const motionData = req.body;

    const insight = await generateFallInsight(motionData);

    res.json({
      success: true,
      insight,
    });
  } catch (err) {
    next(err);
  }
}
