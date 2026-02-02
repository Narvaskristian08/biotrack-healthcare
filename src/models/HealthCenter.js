import mongoose from 'mongoose';

const HealthCenterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    contactNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const HealthCenter = mongoose.model('HealthCenter', HealthCenterSchema);

