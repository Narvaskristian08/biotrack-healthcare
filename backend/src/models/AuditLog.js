import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', index: true },
    barangay: { type: String, default: '', index: true }, // for “no-login” mode: which barangay/clinic performed the action
    actorName: { type: String, default: '', index: true }, // optional free-text (e.g., "Nurse Ana")
    actorType: { type: String, enum: ['admin', 'healthcenter', 'patient', 'unknown'], default: 'unknown', index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    actorSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null, index: true },

    action: { type: String, required: true, index: true }, // e.g. PATIENT.CREATE, RECORD.ADD
    entityType: { type: String, required: true, index: true }, // Patient, PatientRecord, HealthCenter...
    entityId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true },

    outcome: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
    reason: { type: String, default: '' }, // if failure

    // Capstone-friendly: store compact diffs. In production, avoid full PHI in logs; store pointers/redacted diffs.
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },

    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

AuditLogSchema.index({ healthCenterId: 1, createdAt: -1 });
AuditLogSchema.index({ healthCenterId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

