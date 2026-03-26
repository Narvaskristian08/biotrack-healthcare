import mongoose from 'mongoose';

const HealthRecordSchema = new mongoose.Schema(
  {
    healthCenterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Encrypted telemetry payload at rest.
    telemetry: { type: mongoose.Schema.Types.Mixed, default: null },
    // Legacy plaintext fallback fields kept for backward-compatible reads.
    heartRate: Number,
    activityLevel: String, // LOW | MODERATE | HIGH
    riskLevel: String,     // LOW | MODERATE | HIGH | CRITICAL
    fallDetected: { type: Boolean, default: false },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

HealthRecordSchema.index({ healthCenterId: 1, userId: 1, createdAt: -1 });

export default mongoose.model('HealthRecord', HealthRecordSchema);
