import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

function isValidDateInput(value) {
  return !Number.isNaN(new Date(value).getTime());
}

function emptyStringToUndefined(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return value;
}

const objectIdSchema = z.string().trim().regex(objectIdRegex, 'must be a valid ObjectId');
const optionalObjectIdSchema = z.preprocess(emptyStringToUndefined, objectIdSchema.optional());

const booleanInputSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

const optionalDateStringSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  },
  z.union([z.null(), z.string().refine(isValidDateInput, 'must be a valid date')])
);

const optionalShortTextQuerySchema = (fieldName, max = 120) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().max(max, `${fieldName} must be at most ${max} characters`).optional()
  );

const assignedProviderSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.preprocess(emptyStringToUndefined, z.string().email('email must be valid').optional()),
  contactNumber: z.string().trim().max(40).optional(),
});

const aiLanguageSchema = z.preprocess(emptyStringToUndefined, z.enum(['en', 'fil']).optional());

export const emptyBodySchema = z.object({}).strict();

export const aiAnalyzeSchema = z.object({
  patientId: optionalObjectIdSchema,
  heartRate: z.coerce.number().positive('heartRate must be a positive number'),
  activity: z.union([z.string().trim().min(1), z.coerce.number()]).optional(),
  fallDetected: booleanInputSchema.optional(),
  language: aiLanguageSchema,
}).passthrough();

export const activityInsightSchema = z
  .object({
    patientId: optionalObjectIdSchema,
    steps: z.coerce.number().int().min(0).max(200000).optional(),
    activeMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    sedentaryMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      value.steps !== undefined || value.activeMinutes !== undefined || value.sedentaryMinutes !== undefined,
    { message: 'At least one activity metric is required' }
  );

export const fallInsightSchema = z
  .object({
    patientId: optionalObjectIdSchema,
    impactDetected: booleanInputSchema.optional(),
    noMovementAfter: booleanInputSchema.optional(),
    orientationChange: booleanInputSchema.optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      value.impactDetected !== undefined || value.noMovementAfter !== undefined || value.orientationChange !== undefined,
    { message: 'At least one fall signal is required' }
  );

export const trendInsightQuerySchema = z.object({
  patientId: optionalObjectIdSchema,
  language: aiLanguageSchema,
});

export const trendCompareQuerySchema = z.object({
  patientId: optionalObjectIdSchema,
  currentDays: z.coerce.number().int().min(1, 'currentDays must be at least 1').max(30, 'currentDays must be at most 30').optional(),
  previousDays: z.coerce.number().int().min(1, 'previousDays must be at least 1').max(30, 'previousDays must be at most 30').optional(),
});

export const summaryInsightQuerySchema = z.object({
  patientId: optionalObjectIdSchema,
  days: z.coerce.number().int().min(1, 'days must be at least 1').max(30, 'days must be at most 30').optional(),
  language: aiLanguageSchema,
});

export const alertListQuerySchema = z.object({
  patientId: optionalObjectIdSchema,
  includeInsights: booleanInputSchema.optional(),
  limit: z.coerce.number().int().min(1, 'limit must be at least 1').max(100, 'limit must be at most 100').optional(),
});

export const auditLogListQuerySchema = z.object({
  entityType: optionalShortTextQuerySchema('entityType', 80),
  entityId: optionalShortTextQuerySchema('entityId', 120),
  action: optionalShortTextQuerySchema('action', 120),
});

export const patientListQuerySchema = z.object({
  search: optionalShortTextQuerySchema('search', 120),
});

export const patientIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const patientLoginHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1, 'limit must be at least 1').max(100, 'limit must be at most 100').optional(),
});

const patientSexSchema = z.enum(['male', 'female', 'other', 'unknown']);
const patientStatusSchema = z.enum(['active', 'archived']);

export const patientCreateSchema = z.object({
  mrn: z.string().trim().min(1, 'mrn is required'),
  lastName: z.string().trim().min(1, 'lastName is required'),
  firstName: z.string().trim().min(1, 'firstName is required'),
  middleInitial: z.string().trim().min(1, 'middleInitial is required').max(1, 'middleInitial must be 1 character'),
  nameExtension: z.string().trim().optional(),
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
  walletAddress: z.string().trim().optional(),
  birthDate: optionalDateStringSchema.optional(),
  sex: patientSexSchema.optional(),
  address: z.string().trim().min(1, 'address is required'),
  contactNumber: z.string().trim().min(1, 'contactNumber is required'),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
});

export const patientUpdateSchema = z
  .object({
    lastName: z.string().trim().min(1).optional(),
    firstName: z.string().trim().min(1).optional(),
    middleInitial: z.string().trim().min(1).max(1).optional(),
    nameExtension: z.string().trim().optional(),
    email: z.string().trim().email('email must be a valid email address').optional(),
    birthDate: optionalDateStringSchema.optional(),
    sex: patientSexSchema.optional(),
    address: z.string().trim().min(1).optional(),
    contactNumber: z.string().trim().min(1).optional(),
    guardianName: z.string().trim().optional(),
    emergencyContactName: z.string().trim().optional(),
    emergencyContactPhone: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    status: patientStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one updatable field is required',
  });

export const healthCenterSelfUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(140).optional(),
    holderName: z.string().trim().min(1).max(140).optional(),
    healthCenterName: z.string().trim().min(1).max(140).optional(),
    officialContactInfo: z.string().trim().min(1).max(180).optional(),
    address: z.string().trim().min(1).max(220).optional(),
    contactNumber: z.string().trim().min(1).max(40).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });

export const patientRecordParamsSchema = z.object({
  patientId: objectIdSchema,
});

export const patientRecordVerifyParamsSchema = z.object({
  patientId: objectIdSchema,
  recordId: objectIdSchema,
});

export const patientRecordCreateSchema = z.object({
  type: z.enum(['consultation', 'vitals', 'immunization', 'prenatal', 'lab', 'medication', 'referral', 'note', 'other']).optional(),
  data: z.any().refine((value) => value !== null && value !== undefined, 'data is required'),
  capturedAt: optionalDateStringSchema.optional(),
});

export const adminUsersQuerySchema = z.object({
  q: optionalShortTextQuerySchema('q', 120),
  role: z.preprocess(emptyStringToUndefined, z.enum(['patient', 'provider', 'admin']).optional()),
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['pending', 'verified', 'active', 'disabled', 'archived']).optional()
  ),
  limit: z.coerce.number().int().min(1, 'limit must be at least 1').max(500, 'limit must be at most 500').optional(),
});

export const adminLogsQuerySchema = z.object({
  q: optionalShortTextQuerySchema('q', 160),
  action: optionalShortTextQuerySchema('action', 120),
  outcome: optionalShortTextQuerySchema('outcome', 40),
  page: z.coerce.number().int().min(1, 'page must be at least 1').max(100000, 'page is too large').optional(),
  limit: z.coerce.number().int().min(1, 'limit must be at least 1').max(500, 'limit must be at most 500').optional(),
});

export const blockchainMetricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1, 'days must be at least 1').max(30, 'days must be at most 30').optional(),
});

export const adminUserUpdateParamsSchema = z.object({
  userRole: z.enum(['patient', 'provider', 'admin']),
  userId: objectIdSchema,
});

export const providerStatusParamsSchema = z.object({
  providerId: objectIdSchema,
});

export const providerStatusUpdateSchema = z
  .object({
    status: z.enum(['pending', 'verified', 'active']).optional(),
    onboardingStatus: z.enum(['pending', 'verified', 'active']).optional(),
    credentialStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.onboardingStatus !== undefined || value.credentialStatus !== undefined,
    {
      message: 'status is required',
    }
  );

const rbacPatientPatchSchema = z.object({
  canViewOwnDashboard: booleanInputSchema.optional(),
  canViewOwnRecords: booleanInputSchema.optional(),
  canVerifyOwnRecordHashes: booleanInputSchema.optional(),
  canManageOwnProfile: booleanInputSchema.optional(),
});

const rbacProviderPatchSchema = z.object({
  canViewAssignedPatients: booleanInputSchema.optional(),
  canViewVerifiedRecords: booleanInputSchema.optional(),
  canViewAiRiskFlags: booleanInputSchema.optional(),
  canGenerateReports: booleanInputSchema.optional(),
});

const rbacAdminPatchSchema = z.object({
  canManageUsers: booleanInputSchema.optional(),
  canManagePolicies: booleanInputSchema.optional(),
  canMonitorSystem: booleanInputSchema.optional(),
  canMonitorBlockchain: booleanInputSchema.optional(),
  canManageBackups: booleanInputSchema.optional(),
});

const nonEmptyPatchSchema = (schema, message) =>
  schema.refine((value) => Object.keys(value).length > 0, { message });

export const adminRbacUpdateSchema = z.object({
  rbac: nonEmptyPatchSchema(
    z.object({
      patient: nonEmptyPatchSchema(rbacPatientPatchSchema, 'rbac.patient cannot be empty').optional(),
      provider: nonEmptyPatchSchema(rbacProviderPatchSchema, 'rbac.provider cannot be empty').optional(),
      admin: nonEmptyPatchSchema(rbacAdminPatchSchema, 'rbac.admin cannot be empty').optional(),
    }),
    'rbac must include at least one role section'
  ),
});

const dataGovernancePatchSchema = nonEmptyPatchSchema(
  z.object({
    encryptionAtRest: booleanInputSchema.optional(),
    encryptionInTransit: booleanInputSchema.optional(),
    privacyComplianceMode: z.enum(['strict', 'standard']).optional(),
    retentionDays: z.coerce.number().int().min(1).max(3650).optional(),
    backupEnabled: booleanInputSchema.optional(),
    backupSchedule: z.string().trim().min(1).max(80).optional(),
  }),
  'dataGovernance cannot be empty'
);

const performanceThresholdPatchSchema = nonEmptyPatchSchema(
  z.object({
    maxAlertLatencyMs: z.coerce.number().int().min(1).max(60000).optional(),
    maxApiP95Ms: z.coerce.number().int().min(1).max(60000).optional(),
    suspiciousFailuresPerHour: z.coerce.number().int().min(1).max(10000).optional(),
  }),
  'performanceThresholds cannot be empty'
);

export const adminGovernanceUpdateSchema = z
  .object({
    dataGovernance: dataGovernancePatchSchema.optional(),
    performanceThresholds: performanceThresholdPatchSchema.optional(),
  })
  .refine((value) => value.dataGovernance || value.performanceThresholds, {
    message: 'dataGovernance or performanceThresholds is required',
  });

export const adminUserUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    holderName: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(220).optional(),
    contactNumber: z.string().trim().min(1).max(40).optional(),
    status: z.enum(['pending', 'verified', 'active', 'disabled', 'archived']).optional(),
    role: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email('email must be a valid email address').optional(),
    barangayName: z.string().trim().min(1).max(140).optional(),
    cityMunicipality: z.string().trim().min(1).max(140).optional(),
    healthCenterName: z.string().trim().min(1).max(140).optional(),
    officialContactInfo: z.string().trim().min(1).max(140).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    assignedHealthcareProviders: z.array(assignedProviderSchema).max(100).optional(),
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    middleInitial: z.string().trim().min(1).max(1).optional(),
    nameExtension: z.string().trim().max(40).optional(),
    guardianName: z.string().trim().max(120).optional(),
    emergencyContactName: z.string().trim().max(120).optional(),
    emergencyContactPhone: z.string().trim().max(40).optional(),
    sex: patientSexSchema.optional(),
    birthDate: optionalDateStringSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update',
  });
