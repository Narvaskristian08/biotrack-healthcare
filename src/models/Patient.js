import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema(
  {
    healthCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthCenter', required: true, index: true },
    mrn: { type: String, required: true, trim: true }, // medical record number, unique per health center
    fullName: { type: String, required: true, trim: true },
    birthDate: { type: Date, default: null },
    sex: { type: String, enum: ['male', 'female', 'other', 'unknown'], default: 'unknown' },
    address: { type: String, default: '', trim: true },
    contactNumber: { type: String, default: '', trim: true },
    guardianName: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    createdByActorType: { type: String, enum: ['admin', 'healthcenter', 'unknown'], default: 'unknown', index: true },
    createdByActorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByActorType: { type: String, enum: ['admin', 'healthcenter', 'unknown'], default: 'unknown', index: true },
    updatedByActorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

PatientSchema.index({ healthCenterId: 1, mrn: 1 }, { unique: true });
PatientSchema.index({ healthCenterId: 1, fullName: 1 });

export const Patient = mongoose.model('Patient', PatientSchema);

