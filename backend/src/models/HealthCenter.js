import mongoose from 'mongoose';

const HealthCenterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    holderName: { type: String, required: true, trim: true }, // "Holder" in diagram
    role: { type: String, default: 'staff' }, // "Role: staff" in diagram
    contactNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },

    blockchainIdentity: {
      identityId: { type: String, default: '', index: true },
      identityHash: { type: String, default: '', index: true },
      identitySalt: { type: String, default: '' },
      walletAddress: { type: String, default: '', trim: true, lowercase: true, index: true },
      network: { type: String, default: '' },
      txId: { type: String, default: '' },
      blockNumber: { type: Number, default: null },
      proofId: { type: String, default: '' },
      anchoredAt: { type: Date, default: null },
      verificationStatus: {
        type: String,
        enum: ['pending', 'anchored', 'local_only', 'failed'],
        default: 'pending',
        index: true,
      },
      errorMessage: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

HealthCenterSchema.index(
  { 'blockchainIdentity.identityId': 1 },
  { unique: true, partialFilterExpression: { 'blockchainIdentity.identityId': { $type: 'string', $ne: '' } } }
);

HealthCenterSchema.index(
  { 'blockchainIdentity.identityHash': 1 },
  { unique: true, partialFilterExpression: { 'blockchainIdentity.identityHash': { $type: 'string', $ne: '' } } }
);

HealthCenterSchema.index(
  { 'blockchainIdentity.walletAddress': 1 },
  { unique: true, partialFilterExpression: { 'blockchainIdentity.walletAddress': { $type: 'string', $ne: '' } } }
);

export const HealthCenter = mongoose.model('HealthCenter', HealthCenterSchema);

