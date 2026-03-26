import mongoose from 'mongoose';

const HealthCenterSchema = new mongoose.Schema(
  {
    email: { type: String, default: '', lowercase: true, trim: true },
    emailHash: { type: String, required: true, unique: true, index: true },
    emailEncrypted: { type: mongoose.Schema.Types.Mixed, default: null },
    passwordHash: { type: String, required: true },
    // Legacy display name retained for backward-compatible UI rendering.
    name: { type: String, required: true, trim: true },
    barangayName: { type: String, default: '', trim: true, index: true },
    cityMunicipality: { type: String, default: '', trim: true, index: true },
    healthCenterName: { type: String, default: '', trim: true },
    officialContactInfo: { type: String, default: '', trim: true },
    officialContactInfoEncrypted: { type: mongoose.Schema.Types.Mixed, default: null },
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
    addressEncrypted: { type: mongoose.Schema.Types.Mixed, default: null },
    holderName: { type: String, default: '', trim: true }, // "Holder" in diagram
    holderNameEncrypted: { type: mongoose.Schema.Types.Mixed, default: null },
    role: { type: String, default: 'staff' }, // "Role: staff" in diagram
    credentialStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    contactNumber: { type: String, default: '', trim: true },
    contactNumberEncrypted: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ['pending', 'verified', 'active', 'disabled'],
      default: 'pending',
      index: true,
    },

    blockchainIdentity: {
      identityId: { type: String, default: '' },
      identityHash: { type: String, default: '' },
      identitySalt: { type: String, default: '' },
      walletAddress: { type: String, default: '', trim: true, lowercase: true },
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
