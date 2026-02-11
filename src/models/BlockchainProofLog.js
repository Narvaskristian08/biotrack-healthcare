import mongoose from 'mongoose';

const BlockchainProofLogSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['identity', 'record', 'verification'], required: true, index: true },
    status: { type: String, enum: ['success', 'failed', 'skipped'], required: true, index: true },

    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', default: null, index: true },
    subjectType: { type: String, enum: ['patient', 'healthcenter', 'patientrecord', 'unknown'], default: 'unknown', index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    recordId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    identityId: { type: String, default: '', index: true },
    hash: { type: String, default: '', index: true },

    network: { type: String, default: '' },
    contractAddress: { type: String, default: '' },
    txId: { type: String, default: '', index: true },
    blockNumber: { type: Number, default: null },
    proofId: { type: String, default: '' },
    anchoredAt: { type: Date, default: null, index: true },

    reason: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

BlockchainProofLogSchema.index({ kind: 1, subjectType: 1, subjectId: 1, createdAt: -1 });
BlockchainProofLogSchema.index({ kind: 1, recordId: 1, createdAt: -1 });

export const BlockchainProofLog = mongoose.model('BlockchainProofLog', BlockchainProofLogSchema);
