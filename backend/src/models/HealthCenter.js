import mongoose from 'mongoose';

const HealthCenterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Legacy display name retained for backward-compatible UI rendering.
    name: { type: String, required: true, trim: true },
    barangayName: { type: String, default: '', trim: true, index: true },
    cityMunicipality: { type: String, default: '', trim: true, index: true },
    healthCenterName: { type: String, default: '', trim: true },
    officialContactInfo: { type: String, default: '', trim: true },
    geoLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    assignedHealthcareProviders: [
      {
        name: { type: String, default: '', trim: true },
        email: { type: String, default: '', trim: true, lowercase: true },
        contactNumber: { type: String, default: '', trim: true },
      },
    ],
    address: { type: String, default: '', trim: true },
    holderName: { type: String, required: true, trim: true }, // "Holder" in diagram
    role: { type: String, default: 'staff' }, // "Role: staff" in diagram
    credentialStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    contactNumber: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['pending', 'verified', 'active', 'disabled'],
      default: 'pending',
      index: true,
    },

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

