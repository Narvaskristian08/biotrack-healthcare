import TrainingSample from "../../models/TrainingSample.js";

export async function saveTrainingData(vitals, aiOutput) {
  await TrainingSample.create({
    vitals,
    aiOutput
  });
}
