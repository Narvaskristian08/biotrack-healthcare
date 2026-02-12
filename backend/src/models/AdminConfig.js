import mongoose from 'mongoose';

const AdminConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    rbac: {
      patient: {
        canViewOwnDashboard: { type: Boolean, default: true },
        canViewOwnRecords: { type: Boolean, default: true },
        canVerifyOwnRecordHashes: { type: Boolean, default: true },
        canManageOwnProfile: { type: Boolean, default: true },
      },
      provider: {
        canViewAssignedPatients: { type: Boolean, default: true },
        canViewVerifiedRecords: { type: Boolean, default: true },
        canViewAiRiskFlags: { type: Boolean, default: true },
        canGenerateReports: { type: Boolean, default: true },
      },
      admin: {
        canManageUsers: { type: Boolean, default: true },
        canManagePolicies: { type: Boolean, default: true },
        canMonitorSystem: { type: Boolean, default: true },
        canMonitorBlockchain: { type: Boolean, default: true },
        canManageBackups: { type: Boolean, default: true },
      },
    },
    dataGovernance: {
      encryptionAtRest: { type: Boolean, default: true },
      encryptionInTransit: { type: Boolean, default: true },
      privacyComplianceMode: { type: String, default: 'strict', enum: ['strict', 'standard'] },
      retentionDays: { type: Number, default: 365 },
      backupEnabled: { type: Boolean, default: true },
      backupSchedule: { type: String, default: 'daily' },
      lastBackupAt: { type: Date, default: null },
      lastRestoreAt: { type: Date, default: null },
    },
    performanceThresholds: {
      maxAlertLatencyMs: { type: Number, default: 1500 },
      maxApiP95Ms: { type: Number, default: 1200 },
      suspiciousFailuresPerHour: { type: Number, default: 10 },
    },
    updatedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

export const AdminConfig = mongoose.model('AdminConfig', AdminConfigSchema);
