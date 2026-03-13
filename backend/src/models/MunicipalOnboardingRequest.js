import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnboardingFile', required: true },
    label: { type: String, default: '', trim: true },
    fileName: { type: String, default: '', trim: true },
    mimeType: { type: String, default: '', trim: true },
    sizeBytes: { type: Number, default: 0 },
  },
  { _id: false }
);

const DecisionSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['approved', 'rejected'], default: null },
    decidedAt: { type: Date, default: null },
    decidedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    note: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const MunicipalOnboardingRequestSchema = new mongoose.Schema(
  {
    cityMunicipality: { type: String, required: true, trim: true, index: true },
    province: { type: String, default: '', trim: true },
    officeName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    contactRole: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    pricingTier: { type: String, default: '', trim: true },
    estimatedBarangays: { type: Number, default: null },
    estimatedPopulation: { type: Number, default: null },
    desiredStartDate: { type: Date, default: null },
    message: { type: String, default: '', trim: true },
    status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted', index: true },
    attachments: { type: [AttachmentSchema], default: [] },
    decision: { type: DecisionSchema, default: () => ({}) },
  },
  { timestamps: true }
);

MunicipalOnboardingRequestSchema.index({ status: 1, createdAt: -1 });

export const MunicipalOnboardingRequest = mongoose.model(
  'MunicipalOnboardingRequest',
  MunicipalOnboardingRequestSchema
);
