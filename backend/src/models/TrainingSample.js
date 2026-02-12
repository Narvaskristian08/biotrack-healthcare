import mongoose from "mongoose";

const TrainingSampleSchema = new mongoose.Schema({
  vitals: Object,
  aiOutput: String,
  validated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("TrainingSample", TrainingSampleSchema);
