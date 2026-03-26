import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'RISK_ESCALATION',
        'CRITICAL_VITAL',
        'FALL_DETECTED',
        'TREND_INCREASING',
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      required: true,
    },

    message: String,

    acknowledged: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Alert', AlertSchema);
