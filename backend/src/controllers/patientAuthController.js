import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { env } from '../config/env.js';
import { Patient } from '../models/Patient.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { PatientLoginHistory } from '../models/PatientLoginHistory.js';
import { writeAuditLog } from '../services/auditService.js';
import { hashPassword, hashPin, signPatientToken, verifyPassword, verifyPin } from '../services/authService.js';
import { ensureBlockchainIdentityForDocument, verifyBlockchainIdentity } from '../services/blockchain/identity.service.js';
import { deliverPatientVerificationCode, maskContactNumber, maskEmailAddress } from '../services/verificationDelivery.service.js';
import { sha256Hex } from '../utils/crypto.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';

const OTP_REGEX = /^\d{6}$/;
const GENERIC_LOGIN_ERROR = 'Invalid credentials';

function normalizeVerificationMethod(value) {
  const method = String(value ?? '').trim().toLowerCase();
  if (method === 'email' || method === 'sms') return method;
  return '';
}

function getVerificationStatus(patient) {
  return String(patient?.accountVerification?.status ?? 'verified').toLowerCase();
}

function otpExpiryDate() {
  const ttlMinutes = Math.max(1, Number(env.OTP_TTL_MINUTES ?? 10) || 10);
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

function resendCooldownRemainingSeconds(lastSentAt) {
  if (!lastSentAt) return 0;
  const cooldown = Math.max(0, Number(env.OTP_RESEND_COOLDOWN_SECONDS ?? 30) || 30);
  const elapsed = Math.floor((Date.now() - new Date(lastSentAt).getTime()) / 1000);
  return Math.max(0, cooldown - elapsed);
}

function buildVerificationSummary(patient) {
  return {
    status: getVerificationStatus(patient) === 'verified' ? 'verified' : 'pending',
    emailMasked: maskEmailAddress(patient.email),
    contactNumberMasked: maskContactNumber(patient.contactNumber),
  };
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value ?? '').trim());
}

function createMfaChallengeId() {
  return crypto.randomBytes(24).toString('hex');
}

function getMfaAttemptLimit() {
  return Math.max(1, Number(env.MFA_LOGIN_MAX_ATTEMPTS ?? 5) || 5);
}

function clearPatientLoginMfa(patient) {
  patient.set('loginMfa.challengeId', '');
  patient.set('loginMfa.method', '');
  patient.set('loginMfa.codeHash', '');
  patient.set('loginMfa.codeExpiresAt', null);
  patient.set('loginMfa.lastSentAt', null);
  patient.set('loginMfa.attempts', 0);
}

async function recordPatientLoginHistory({ req, patient, token }) {
  const ip = String(req?.ip ?? req?.headers?.['x-forwarded-for'] ?? '').trim();
  const userAgent = String(req?.headers?.['user-agent'] ?? '').trim();
  let expiresAt = null;
  try {
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
      expiresAt = new Date(Number(decoded.exp) * 1000);
    }
  } catch {
    expiresAt = null;
  }

  await PatientLoginHistory.create({
    healthCenterId: patient.healthCenterId,
    patientId: patient._id,
    tokenHash: sha256Hex(token),
    ip,
    userAgent,
    loginAt: new Date(),
    expiresAt,
  });
}

function buildPatientLoginPayload({ patient, identity, identityVerification, token }) {
  return {
    accessToken: token,
    patient: {
      id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      role: 'patient',
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        verified: identityVerification.verified,
        onChain: identityVerification.onChain,
      },
    },
  };
}

async function issuePatientAccessToken({ req, patient, identity, identityVerification }) {
  const token = signPatientToken({
    patientId: patient._id,
    healthCenterId: patient.healthCenterId,
  });

  await recordPatientLoginHistory({ req, patient, token });
  await writeAuditLog({
    req,
    action: 'PATIENT.LOGIN',
    entityType: 'Patient',
    entityId: patient._id,
    outcome: 'success',
  });

  return buildPatientLoginPayload({ patient, identity, identityVerification, token });
}

export async function registerPatientPublic(req, res) {
  const {
    healthCenterId,
    mrn,
    lastName,
    firstName,
    middleInitial,
    email,
    password,
    walletAddress,
    address,
    contactNumber,
    nameExtension,
    birthDate = null,
    sex = 'unknown',
    guardianName = '',
    emergencyContactName = '',
    emergencyContactPhone = '',
  } = req.body ?? {};

  if (!healthCenterId || !email || !password || !lastName || !firstName || !middleInitial || !address || !contactNumber) {
    return res.status(400).json({ error: { message: 'Missing required fields' } });
  }
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) return res.status(400).json({ error: { message: passwordCheck.message } });

  const normalizedSex = String(sex ?? 'unknown').trim().toLowerCase() || 'unknown';
  if (!['male', 'female', 'other', 'unknown'].includes(normalizedSex)) {
    return res.status(400).json({ error: { message: "sex must be one of: male, female, other, unknown" } });
  }

  let normalizedBirthDate = null;
  if (birthDate) {
    normalizedBirthDate = new Date(birthDate);
    if (Number.isNaN(normalizedBirthDate.getTime())) {
      return res.status(400).json({ error: { message: 'birthDate must be a valid date' } });
    }
  }

  const hc = await HealthCenter.findById(healthCenterId);
  if (!hc) return res.status(404).json({ error: { message: 'Health Center not found' } });
  if (String(hc.status) !== 'active') {
    return res.status(403).json({
      error: {
        message: `Selected barangay unit is '${hc.status}'. Only active barangays can onboard patients.`,
        code: 'BARANGAY_NOT_ACTIVE',
      },
    });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existingEmail = await Patient.findOne({ healthCenterId, email: normalizedEmail });
  if (existingEmail) return res.status(409).json({ error: { message: 'Email already registered in this center' } });

  const finalMrn = mrn ? String(mrn).trim() : undefined;
  const passwordHash = await hashPassword(String(password));

  const patient = await Patient.create({
    healthCenterId,
    mrn: finalMrn,
    lastName: String(lastName).trim(),
    firstName: String(firstName).trim(),
    middleInitial: String(middleInitial ?? '').trim().slice(0, 1),
    nameExtension: nameExtension ? String(nameExtension).trim() : '',
    email: normalizedEmail,
    passwordHash,
    birthDate: normalizedBirthDate,
    sex: normalizedSex,
    address: String(address ?? '').trim(),
    contactNumber: String(contactNumber ?? '').trim(),
    guardianName: String(guardianName ?? '').trim(),
    emergencyContactName: String(emergencyContactName ?? '').trim(),
    emergencyContactPhone: String(emergencyContactPhone ?? '').trim(),
    role: 'patient',
    accountVerification: {
      status: 'pending',
    },
    createdByActorType: 'unknown',
  });

  const { identity } = await ensureBlockchainIdentityForDocument({
    doc: patient,
    subjectType: 'patient',
    uniqueSeed: patient.email,
    walletAddress,
    healthCenterId: patient.healthCenterId,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.REGISTER_SELF',
    entityType: 'Patient',
    entityId: patient._id,
    after: { email: patient.email, verificationStatus: 'pending' },
  });

  return res.status(201).json({
    message: 'Registration successful. Verify your account to continue.',
    verificationRequired: true,
    patient: {
      id: patient._id,
      email: patient.email,
      contactNumber: patient.contactNumber,
      verification: buildVerificationSummary(patient),
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        txId: identity.txId,
      },
    },
  });
}

export async function sendPatientVerificationCode(req, res) {
  const patientId = String(req.body?.patientId ?? '').trim();
  const method = normalizeVerificationMethod(req.body?.method);

  if (!isValidObjectId(patientId)) {
    return res.status(400).json({ error: { message: 'Valid patientId is required' } });
  }
  if (!method) {
    return res.status(400).json({ error: { message: "method must be either 'email' or 'sms'" } });
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    return res.status(404).json({ error: { message: 'Patient not found' } });
  }

  if (getVerificationStatus(patient) === 'verified') {
    return res.json({
      message: 'Account already verified',
      verificationStatus: 'verified',
      method,
      recipientMasked: method === 'email' ? maskEmailAddress(patient.email) : maskContactNumber(patient.contactNumber),
    });
  }

  const channel = method === 'email' ? patient.accountVerification?.email : patient.accountVerification?.sms;
  const retryAfterSeconds = resendCooldownRemainingSeconds(channel?.lastSentAt);
  if (retryAfterSeconds > 0) {
    return res.status(429).json({
      error: {
        message: `Please wait ${retryAfterSeconds} seconds before requesting another code`,
        code: 'OTP_RATE_LIMITED',
      },
    });
  }

  const code = generateVerificationCode();
  const codeHash = await hashPin(code);
  const expiresAt = otpExpiryDate();
  const now = new Date();

  patient.set(`accountVerification.${method}.codeHash`, codeHash);
  patient.set(`accountVerification.${method}.codeExpiresAt`, expiresAt);
  patient.set(`accountVerification.${method}.lastSentAt`, now);
  await patient.save();

  const delivery = await deliverPatientVerificationCode({
    method,
    code,
    email: patient.email,
    contactNumber: patient.contactNumber,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.VERIFICATION.CODE_SENT',
    entityType: 'Patient',
    entityId: patient._id,
    after: { method, recipient: delivery.recipientMasked },
  });

  return res.json({
    message: `Verification code sent via ${method === 'email' ? 'email' : 'SMS'}`,
    method,
    verificationStatus: 'pending',
    recipientMasked: delivery.recipientMasked,
    expiresAt,
    devPreviewCode: delivery.devPreviewCode,
  });
}

export async function verifyPatientRegistrationCode(req, res) {
  const patientId = String(req.body?.patientId ?? '').trim();
  const method = normalizeVerificationMethod(req.body?.method);
  const code = String(req.body?.code ?? '').trim();

  if (!isValidObjectId(patientId)) {
    return res.status(400).json({ error: { message: 'Valid patientId is required' } });
  }
  if (!method) {
    return res.status(400).json({ error: { message: "method must be either 'email' or 'sms'" } });
  }
  if (!OTP_REGEX.test(code)) {
    return res.status(400).json({ error: { message: 'code must be a valid 6-digit number' } });
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    return res.status(404).json({ error: { message: 'Patient not found' } });
  }

  if (getVerificationStatus(patient) === 'verified') {
    return res.json({
      message: 'Account already verified',
      verificationStatus: 'verified',
      patient: {
        id: patient._id,
        email: patient.email,
      },
    });
  }

  const channel = method === 'email' ? patient.accountVerification?.email : patient.accountVerification?.sms;
  if (!channel?.codeHash || !channel?.codeExpiresAt) {
    return res.status(400).json({
      error: {
        message: 'No active verification code found. Please request a new code.',
        code: 'OTP_NOT_REQUESTED',
      },
    });
  }

  if (new Date(channel.codeExpiresAt).getTime() < Date.now()) {
    return res.status(400).json({
      error: {
        message: 'Verification code expired. Please request a new code.',
        code: 'OTP_EXPIRED',
      },
    });
  }

  const validCode = await verifyPin(code, channel.codeHash);
  if (!validCode) {
    await writeAuditLog({
      req,
      action: 'PATIENT.VERIFICATION.CODE_VERIFY',
      entityType: 'Patient',
      entityId: patient._id,
      outcome: 'failure',
      reason: 'Invalid code',
      after: { method },
    });
    return res.status(401).json({
      error: {
        message: 'Invalid verification code',
        code: 'OTP_INVALID',
      },
    });
  }

  const verifiedAt = new Date();
  patient.set(`accountVerification.${method}.verifiedAt`, verifiedAt);
  patient.set('accountVerification.email.codeHash', '');
  patient.set('accountVerification.email.codeExpiresAt', null);
  patient.set('accountVerification.sms.codeHash', '');
  patient.set('accountVerification.sms.codeExpiresAt', null);
  patient.set('accountVerification.status', 'verified');
  patient.set('accountVerification.verifiedAt', verifiedAt);
  await patient.save();

  await writeAuditLog({
    req,
    action: 'PATIENT.VERIFICATION.SUCCESS',
    entityType: 'Patient',
    entityId: patient._id,
    after: { method, verifiedAt },
  });

  return res.json({
    message: 'Account verified successfully',
    verificationStatus: 'verified',
    patient: {
      id: patient._id,
      email: patient.email,
    },
  });
}

export async function loginPatient(req, res) {
  const { email, password, mfaMethod } = req.body ?? {};

  if (!email || !password) {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const patients = await Patient.find({ email: normalizedEmail });

  if (patients.length === 0) {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  let match = null;
  for (const patient of patients) {
    if (await verifyPassword(String(password), patient.passwordHash)) {
      match = patient;
      break;
    }
  }

  if (!match) {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  if (match.status !== 'active') {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  const owningHealthCenter = await HealthCenter.findById(match.healthCenterId).select('status').lean();
  if (!owningHealthCenter || String(owningHealthCenter.status) !== 'active') {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  if (getVerificationStatus(match) !== 'verified') {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  if (!env.PATIENT_LOGIN_MFA_REQUIRED) {
    const { identity } = await ensureBlockchainIdentityForDocument({
      doc: match,
      subjectType: 'patient',
      uniqueSeed: match.email,
      healthCenterId: match.healthCenterId,
    });
    const identityVerification = await verifyBlockchainIdentity(identity, {
      subjectType: 'patient',
      subjectId: match._id,
      healthCenterId: match.healthCenterId,
    });
    return res.json(await issuePatientAccessToken({ req, patient: match, identity, identityVerification }));
  }

  const method = normalizeVerificationMethod(mfaMethod) || 'email';
  const retryAfterSeconds = resendCooldownRemainingSeconds(match.loginMfa?.lastSentAt);
  if (retryAfterSeconds > 0) {
    return res.status(429).json({
      error: {
        message: `Please wait ${retryAfterSeconds} seconds before requesting another code`,
        code: 'OTP_RATE_LIMITED',
      },
    });
  }

  const code = generateVerificationCode();
  const codeHash = await hashPin(code);
  const challengeId = createMfaChallengeId();
  const expiresAt = otpExpiryDate();
  const now = new Date();

  match.set('loginMfa.challengeId', challengeId);
  match.set('loginMfa.method', method);
  match.set('loginMfa.codeHash', codeHash);
  match.set('loginMfa.codeExpiresAt', expiresAt);
  match.set('loginMfa.lastSentAt', now);
  match.set('loginMfa.attempts', 0);
  await match.save();

  const delivery = await deliverPatientVerificationCode({
    method,
    code,
    email: match.email,
    contactNumber: match.contactNumber,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.LOGIN.MFA.CHALLENGE',
    entityType: 'Patient',
    entityId: match._id,
    outcome: 'success',
    after: {
      method,
      recipient: delivery.recipientMasked,
      expiresAt,
    },
  });

  return res.json({
    mfaRequired: true,
    challengeId,
    patientId: match._id,
    method,
    recipientMasked: delivery.recipientMasked,
    expiresAt,
    devPreviewCode: delivery.devPreviewCode,
  });
}

export async function verifyPatientLoginMfa(req, res) {
  const patientId = String(req.body?.patientId ?? '').trim();
  const challengeId = String(req.body?.challengeId ?? '').trim();
  const code = String(req.body?.code ?? '').trim();

  if (!isValidObjectId(patientId) || !challengeId || !OTP_REGEX.test(code)) {
    return res.status(400).json({ error: { message: 'Invalid MFA payload' } });
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    return res.status(401).json({ error: { message: 'Invalid or expired MFA challenge' } });
  }
  if (patient.status !== 'active') {
    clearPatientLoginMfa(patient);
    await patient.save();
    return res.status(401).json({ error: { message: 'Invalid or expired MFA challenge' } });
  }
  if (getVerificationStatus(patient) !== 'verified') {
    clearPatientLoginMfa(patient);
    await patient.save();
    return res.status(401).json({ error: { message: 'Invalid or expired MFA challenge' } });
  }

  const currentChallengeId = String(patient.loginMfa?.challengeId ?? '').trim();
  const codeHash = String(patient.loginMfa?.codeHash ?? '').trim();
  const codeExpiresAt = patient.loginMfa?.codeExpiresAt ? new Date(patient.loginMfa.codeExpiresAt) : null;
  if (!currentChallengeId || currentChallengeId !== challengeId || !codeHash || !codeExpiresAt) {
    return res.status(401).json({ error: { message: 'Invalid or expired MFA challenge' } });
  }

  if (codeExpiresAt.getTime() < Date.now()) {
    clearPatientLoginMfa(patient);
    await patient.save();
    return res.status(401).json({ error: { message: 'MFA code expired. Please sign in again.' } });
  }

  const attempts = Number(patient.loginMfa?.attempts ?? 0);
  const maxAttempts = getMfaAttemptLimit();
  if (attempts >= maxAttempts) {
    clearPatientLoginMfa(patient);
    await patient.save();
    return res.status(429).json({
      error: {
        message: 'Too many invalid MFA attempts. Please sign in again.',
        code: 'MFA_ATTEMPTS_EXCEEDED',
      },
    });
  }

  const validCode = await verifyPin(code, codeHash);
  if (!validCode) {
    const nextAttempts = attempts + 1;
    patient.set('loginMfa.attempts', nextAttempts);
    if (nextAttempts >= maxAttempts) {
      clearPatientLoginMfa(patient);
      await patient.save();
      await writeAuditLog({
        req,
        action: 'PATIENT.LOGIN.MFA.VERIFY',
        entityType: 'Patient',
        entityId: patient._id,
        outcome: 'failure',
        reason: 'MFA attempts exceeded',
      });
      return res.status(429).json({
        error: {
          message: 'Too many invalid MFA attempts. Please sign in again.',
          code: 'MFA_ATTEMPTS_EXCEEDED',
        },
      });
    }

    await patient.save();
    await writeAuditLog({
      req,
      action: 'PATIENT.LOGIN.MFA.VERIFY',
      entityType: 'Patient',
      entityId: patient._id,
      outcome: 'failure',
      reason: 'Invalid MFA code',
      after: { attempts: nextAttempts },
    });
    return res.status(401).json({
      error: {
        message: 'Invalid MFA code',
        code: 'MFA_INVALID',
      },
    });
  }

  clearPatientLoginMfa(patient);
  await patient.save();

  const owningHealthCenter = await HealthCenter.findById(patient.healthCenterId).select('status').lean();
  if (!owningHealthCenter || String(owningHealthCenter.status) !== 'active') {
    return res.status(401).json({ error: { message: 'Invalid or expired MFA challenge' } });
  }

  const { identity } = await ensureBlockchainIdentityForDocument({
    doc: patient,
    subjectType: 'patient',
    uniqueSeed: patient.email,
    healthCenterId: patient.healthCenterId,
  });
  const identityVerification = await verifyBlockchainIdentity(identity, {
    subjectType: 'patient',
    subjectId: patient._id,
    healthCenterId: patient.healthCenterId,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.LOGIN.MFA.VERIFY',
    entityType: 'Patient',
    entityId: patient._id,
    outcome: 'success',
  });

  const payload = await issuePatientAccessToken({ req, patient, identity, identityVerification });
  return res.json({
    ...payload,
    mfaVerified: true,
  });
}
