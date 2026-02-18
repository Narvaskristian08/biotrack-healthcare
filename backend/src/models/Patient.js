import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema(
  {
    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', required: true, index: true },
    // medical record number, unique per health center (Optional now as per diagram)
    mrn: { type: String, trim: true },

    // Split name fields
    lastName: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleInitial: { type: String, required: true, trim: true, maxLength: 1 },
    nameExtension: { type: String, default: '', trim: true },

    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    token: { type: String, default: '' }, // For log times
    role: { type: String, default: 'patient' },

    // Removed BirthDate, Sex from required/diagram
    birthDate: { type: Date, default: null },
    sex: { type: String, enum: ['male', 'female', 'other', 'unknown'], default: 'unknown' },

    address: { type: String, required: true, default: '', trim: true },
    contactNumber: { type: String, required: true, default: '', trim: true },

    guardianName: { type: String, default: '', trim: true },
    emergencyContactName: { type: String, default: '', trim: true },
    emergencyContactPhone: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    accountVerification: {
      status: { type: String, enum: ['pending', 'verified'], default: 'pending', index: true },
      verifiedAt: { type: Date, default: null },
      email: {
        codeHash: { type: String, default: '' },
        codeExpiresAt: { type: Date, default: null },
        lastSentAt: { type: Date, default: null },
        verifiedAt: { type: Date, default: null },
      },
      sms: {
        codeHash: { type: String, default: '' },
        codeExpiresAt: { type: Date, default: null },
        lastSentAt: { type: Date, default: null },
        verifiedAt: { type: Date, default: null },
      },
    },
    createdByActorType: { type: String, enum: ['admin', 'healthcenter', 'unknown'], default: 'unknown', index: true },
    createdByActorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByActorType: { type: String, enum: ['admin', 'healthcenter', 'unknown'], default: 'unknown', index: true },
    updatedByActorId: { type: mongoose.Schema.Types.ObjectId, default: null },

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

PatientSchema.index({ healthCenterId: 1, email: 1 }, { unique: true });
PatientSchema.index({ healthCenterId: 1, lastName: 1, firstName: 1 });

PatientSchema.index(
  { 'blockchainIdentity.identityId': 1 },
  { unique: true, partialFilterExpression: { 'blockchainIdentity.identityId': { $type: 'string', $ne: '' } } }
);

PatientSchema.index(
  { 'blockchainIdentity.identityHash': 1 },
  { unique: true, partialFilterExpression: { 'blockchainIdentity.identityHash': { $type: 'string', $ne: '' } } }
);

PatientSchema.index(
  { 'blockchainIdentity.walletAddress': 1 },
  { unique: true, partialFilterExpression: { 'blockchainIdentity.walletAddress': { $type: 'string', $ne: '' } } }
);

export const Patient = mongoose.model('Patient', PatientSchema);
