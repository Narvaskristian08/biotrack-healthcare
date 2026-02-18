import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { Patient } from '../models/Patient.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { PatientLoginHistory } from '../models/PatientLoginHistory.js';
import { writeAuditLog } from '../services/auditService.js';
import { hashPassword, hashPin, verifyPassword, verifyPin } from '../services/authService.js';
import { ensureBlockchainIdentityForDocument, verifyBlockchainIdentity } from '../services/blockchain/identity.service.js';
import { blockchainEnabled } from '../services/blockchain/client.js';
import { deliverPatientVerificationCode, maskContactNumber, maskEmailAddress } from '../services/verificationDelivery.service.js';
import { sha256Hex } from '../utils/crypto.js';

const OTP_REGEX = /^\d{6}$/;

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
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email and password required' } });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const patients = await Patient.find({ email: normalizedEmail });

  if (patients.length === 0) {
    return res.status(401).json({ error: { message: 'Invalid credentials' } });
  }

  let match = null;
  for (const patient of patients) {
    if (await verifyPassword(String(password), patient.passwordHash)) {
      match = patient;
      break;
    }
  }

  if (!match) {
    return res.status(401).json({ error: { message: 'Invalid credentials' } });
  }

  if (match.status !== 'active') {
    return res.status(403).json({ error: { message: 'Patient account is not active' } });
  }

  const owningHealthCenter = await HealthCenter.findById(match.healthCenterId).select('status').lean();
  if (!owningHealthCenter || String(owningHealthCenter.status) !== 'active') {
    return res.status(403).json({
      error: {
        message: 'Your barangay unit is not active yet. Please contact your health center administrator.',
        code: 'BARANGAY_NOT_ACTIVE',
      },
    });
  }

  if (getVerificationStatus(match) !== 'verified') {
    return res.status(403).json({
      error: {
        message: 'Account not verified. Please verify via email or SMS first.',
        code: 'ACCOUNT_NOT_VERIFIED',
        details: {
          patientId: String(match._id),
          verification: buildVerificationSummary(match),
        },
      },
    });
  }

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

  if (blockchainEnabled() && identityVerification.onChain && !identityVerification.verified) {
    await writeAuditLog({
      req,
      action: 'PATIENT.LOGIN',
      entityType: 'Patient',
      entityId: match._id,
      outcome: 'failure',
      reason: 'Blockchain identity verification failed',
      after: {
        identityId: identity.identityId,
        verificationReason: identityVerification.reason,
      },
    });
    return res.status(403).json({
      error: {
        message: 'Blockchain identity verification failed for this account.',
        code: 'BLOCKCHAIN_IDENTITY_NOT_VERIFIED',
      },
    });
  }

  const token = jwt.sign(
    {
      tokenType: 'patient',
      patientId: match._id,
      healthCenterId: match.healthCenterId,
    },
    env.SESSION_JWT_SECRET,
    { expiresIn: env.SESSION_TOKEN_TTL }
  );

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
    healthCenterId: match.healthCenterId,
    patientId: match._id,
    tokenHash: sha256Hex(token),
    ip,
    userAgent,
    loginAt: new Date(),
    expiresAt,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.LOGIN',
    entityType: 'Patient',
    entityId: match._id,
    outcome: 'success',
  });

  return res.json({
    accessToken: token,
    patient: {
      id: match._id,
      firstName: match.firstName,
      lastName: match.lastName,
      email: match.email,
      role: 'patient',
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        verified: identityVerification.verified,
        onChain: identityVerification.onChain,
      },
    },
  });
}
