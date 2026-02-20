import mongoose from 'mongoose';

const PatientLoginHistorySchema = new mongoose.Schema(
  {
    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    tokenHash: { type: String, default: '', trim: true, index: true },
    ip: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true },
    loginAt: { type: Date, default: Date.now, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PatientLoginHistorySchema.index({ patientId: 1, loginAt: -1 });
PatientLoginHistorySchema.index({ healthCenterId: 1, patientId: 1, loginAt: -1 });
PatientLoginHistorySchema.index({ patientId: 1, tokenHash: 1 });

export const PatientLoginHistory = mongoose.model('PatientLoginHistory', PatientLoginHistorySchema);
