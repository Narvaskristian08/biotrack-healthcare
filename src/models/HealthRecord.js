import mongoose from 'mongoose';

const HealthRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    heartRate: Number,
    activityLevel: String, // LOW | MODERATE | HIGH
    riskLevel: String,     // LOW | MODERATE | HIGH | CRITICAL

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('HealthRecord', HealthRecordSchema);
