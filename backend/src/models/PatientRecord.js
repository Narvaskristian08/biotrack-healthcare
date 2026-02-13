import mongoose from 'mongoose';

const PatientRecordSchema = new mongoose.Schema(
  {
    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

    type: {
      type: String,
      enum: ['consultation', 'vitals', 'immunization', 'prenatal', 'lab', 'medication', 'referral', 'note', 'other'],
      default: 'note',
      index: true,
    },

    // Sensitive clinical content (capstone-friendly: stored as JSON; in production, encrypt/segment)
    data: { type: mongoose.Schema.Types.Mixed, required: true },

    // Integrity fields
    recordHash: { type: String, required: true, index: true }, // sha256(canonical JSON of data + metadata)
    hashSchemaVersion: { type: Number, enum: [1, 2], default: 2, index: true },
    recordNonce: { type: String, default: '', trim: true, index: true },
    capturedAt: { type: Date, default: null, index: true },
    blockchain: {
      enabled: { type: Boolean, default: false },
      network: { type: String, default: '' },
      contractAddress: { type: String, default: '' },
      txId: { type: String, default: '' },
      blockNumber: { type: Number, default: null },
      proofId: { type: String, default: '' },
      anchoredAt: { type: Date, default: null },
      lastVerifiedAt: { type: Date, default: null },
      verificationStatus: {
        type: String,
        enum: ['pending', 'anchored', 'unanchored', 'failed', 'tampered'],
        default: 'unanchored',
      },
      errorMessage: { type: String, default: '' },
    },

    createdByActorType: { type: String, enum: ['admin', 'healthcenter', 'unknown'], default: 'unknown', index: true },
    createdByActorId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  },
  { timestamps: true }
);

PatientRecordSchema.index({ healthCenterId: 1, patientId: 1, createdAt: -1 });

export const PatientRecord = mongoose.model('PatientRecord', PatientRecordSchema);

