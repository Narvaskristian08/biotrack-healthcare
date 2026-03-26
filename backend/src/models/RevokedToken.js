import mongoose from 'mongoose';

const RevokedTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    tokenType: { type: String, enum: ['admin', 'healthcenter', 'session', 'patient', 'unknown'], default: 'unknown', index: true },
    revokedAt: { type: Date, default: () => new Date(), index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// TTL index for automatic cleanup after token expiry.
RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedToken = mongoose.model('RevokedToken', RevokedTokenSchema);

