import fs from "fs";
import TrainingSample from "../../models/TrainingSample.js";

export async function buildTrainingDataset() {
  const samples = await TrainingSample.find({ validated: true });

  const lines = samples.map(sample =>
    JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a non-diagnostic health advisory assistant."
        },
        {
          role: "user",
          content: JSON.stringify(sample.vitals)
        },
        {
          role: "assistant",
          content: sample.aiOutput
        }
      ]
    })
  );

  fs.writeFileSync(
    "biotrack_retrain.jsonl",
    lines.join("\n")
  );
}
