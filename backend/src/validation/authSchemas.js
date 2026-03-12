import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
}).passthrough();

export const adminRegisterSchema = loginSchema;

export const providerCreateSchema = z.object({
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
  barangayName: z.string().trim().min(1, 'barangayName is required'),
  cityMunicipality: z.string().trim().min(1, 'cityMunicipality is required'),
  healthCenterName: z.string().trim().min(1, 'healthCenterName is required'),
  officialContactInfo: z.string().trim().min(1, 'officialContactInfo is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  status: z.enum(['pending', 'verified', 'active']).optional(),
}).passthrough();

export const patientPublicRegisterSchema = z.object({
  healthCenterId: z.string().trim().min(1, 'healthCenterId is required'),
  lastName: z.string().trim().min(1, 'lastName is required'),
  firstName: z.string().trim().min(1, 'firstName is required'),
  middleInitial: z.string().trim().min(1, 'middleInitial is required').max(1, 'middleInitial must be 1 character'),
  nameExtension: z.string().trim().optional(),
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
  address: z.string().trim().min(1, 'address is required'),
  contactNumber: z.string().trim().min(1, 'contactNumber is required'),
  mrn: z.string().trim().optional(),
  walletAddress: z.string().trim().optional(),
  birthDate: z.union([z.string(), z.null()]).optional(),
  sex: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  guardianName: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
}).passthrough();

export const oauthGoogleSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
}).passthrough();

export const verificationSendCodeSchema = z.object({
  patientId: z.string().trim().min(1, 'patientId is required'),
  method: z.enum(['email', 'sms']),
}).passthrough();

export const verificationVerifyCodeSchema = z.object({
  patientId: z.string().trim().min(1, 'patientId is required'),
  method: z.enum(['email', 'sms']),
  code: z.string().trim().regex(/^\d{6}$/, 'code must be a valid 6-digit number'),
}).passthrough();

export const patientLoginMfaVerifySchema = z.object({
  patientId: z.string().trim().min(1, 'patientId is required'),
  challengeId: z.string().trim().min(1, 'challengeId is required'),
  code: z.string().trim().regex(/^\d{6}$/, 'code must be a valid 6-digit number'),
}).passthrough();

export const patientForgotPasswordSchema = z.object({
  email: z.string().trim().email('email must be a valid email address'),
}).passthrough();

export const patientResetPasswordSchema = z.object({
  email: z.string().trim().email('email must be a valid email address'),
  code: z.string().trim().regex(/^\d{6}$/, 'code must be a valid 6-digit number'),
  newPassword: z.string().min(1, 'newPassword is required'),
}).passthrough();

export const adminUpsertSchema = z.object({
  role: z.enum(['patient', 'provider', 'admin']),
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
  adminScope: z.enum(['global', 'municipal']).optional(),
  adminCityMunicipality: z.string().trim().min(1).max(140).optional(),
}).passthrough();
