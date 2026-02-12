import { generateActivityInsight } from '../services/ai/activityInsight.service.js';

export async function getActivityInsight(req, res, next) {
  try {
    const activityData = req.body;

    const insight = await generateActivityInsight(activityData);

    res.json({
      success: true,
      insight,
    });
  } catch (err) {
    next(err);
  }
}
