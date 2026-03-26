import mongoose from 'mongoose';

const OnboardingFileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true },
    storagePath: { type: String, required: true, trim: true },
    uploadedByIp: { type: String, default: '' },
    uploadedByUserAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

OnboardingFileSchema.index({ createdAt: -1 });

export const OnboardingFile = mongoose.model('OnboardingFile', OnboardingFileSchema);
