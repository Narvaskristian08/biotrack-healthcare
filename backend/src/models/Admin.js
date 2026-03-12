import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, default: '', lowercase: true, trim: true },
    emailHash: { type: String, required: true, unique: true, index: true },
    emailEncrypted: { type: mongoose.Schema.Types.Mixed, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const Admin = mongoose.model('Admin', AdminSchema);
