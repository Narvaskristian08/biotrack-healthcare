import { runHealthInference } from "../services/ai/inference.service.js";
import { saveTrainingData } from "../services/ai/trainingData.service.js";

export async function analyzeVitals(req, res) {
  const vitals = req.body;

  const aiResult = await runHealthInference(vitals);

  // Save for future training
  await saveTrainingData(vitals, aiResult);

  res.json({
    success: true,
    aiResult
  });
}
