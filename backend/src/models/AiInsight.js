import mongoose from 'mongoose';

const AiInsightSchema = new mongoose.Schema(
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

    healthRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ['en', 'fil'],
      default: 'en',
      index: true,
    },

    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },

    provider: { type: String, default: 'openrouter' },
    model: { type: String, default: '' },
    promptVersion: { type: String, default: '' },

    usedFallback: { type: Boolean, default: false },
    timedOut: { type: Boolean, default: false },
    aiRequestMs: { type: Number, default: null },

    validationIssues: { type: [String], default: [] },
    inputContext: { type: mongoose.Schema.Types.Mixed, default: null },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    text: { type: String, default: '' },
  },
  { timestamps: true }
);

AiInsightSchema.index({ healthCenterId: 1, userId: 1, createdAt: -1 });
AiInsightSchema.index({ healthRecordId: 1, createdAt: -1 });

export default mongoose.model('AiInsight', AiInsightSchema);

