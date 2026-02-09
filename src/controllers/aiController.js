import { runHealthInference } from '../services/ai/inference.service.js';

export async function analyzeVitals(req, res, next) {
  try {
    const vitals = req.body;

    const aiResult = await runHealthInference(vitals);

    res.json({
      success: true,
      aiResult,
    });
  } catch (err) {
    next(err);
  }
}
