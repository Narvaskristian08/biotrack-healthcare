import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', required: true, index: true },
    sessionTokenHash: { type: String, required: true, unique: true, index: true },
    startedAt: { type: Date, required: true, default: () => new Date(), index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

SessionSchema.index({ healthCenterId: 1, revokedAt: 1 });

export const Session = mongoose.model('Session', SessionSchema);

