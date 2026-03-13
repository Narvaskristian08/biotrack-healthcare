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
import { runDetachedTask } from '../utils/backgroundTask.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import {
  buildEmailFields,
  buildMrnFields,
  buildPhoneFields,
  encryptPiiValue,
  normalizeText,
  resolvePiiField,
} from '../services/pii.service.js';

const OTP_REGEX = /^\d{6}$/;
const GENERIC_LOGIN_ERROR = 'Invalid credentials';
const GENERIC_PASSWORD_RESET_REQUEST_MESSAGE = 'If an active patient account with that email exists, a reset code has been sent.';
const GENERIC_PASSWORD_RESET_ERROR = 'Invalid or expired reset code';

function buildQueuedBlockchainIdentityPayload() {
  return {
    identityId: '',
    verificationStatus: 'pending',
    txId: '',
  };
}

function resolveErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error?.message === 'string') return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isRecoverableBlockchainFailure(error) {
  const statusCode = Number(error?.statusCode ?? error?.status ?? 0);
  if (statusCode === 502) return true;
  const code = String(error?.code ?? '').trim();
  return code.startsWith('BLOCKCHAIN_');
}

function buildBlockchainIdentityVerificationFallback(error) {
  return {
    verified: false,
    onChain: Boolean(env.BLOCKCHAIN_ENABLED),
    reason: 'IDENTITY_VERIFY_ERROR',
    error: resolveErrorMessage(error),
  };
}

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
  const email = resolvePiiField({ encrypted: patient?.emailEncrypted, fallback: patient?.email, field: 'email' });
  const contactNumber = resolvePiiField({
    encrypted: patient?.contactNumberEncrypted,
    fallback: patient?.contactNumber,
    field: 'contactNumber',
  });
  return {
    status: getVerificationStatus(patient) === 'verified' ? 'verified' : 'pending',
    emailMasked: maskEmailAddress(email),
    contactNumberMasked: maskContactNumber(contactNumber),
  };
}

function buildHealthCenterSummary(center) {
  if (!center) return null;
  return {
    id: center._id,
    name: String(center.name ?? '').trim(),
    barangayName: String(center.barangayName ?? '').trim(),
    cityMunicipality: String(center.cityMunicipality ?? '').trim(),
    healthCenterName: String(center.healthCenterName ?? '').trim(),
    address: resolvePiiField({ encrypted: center.addressEncrypted, fallback: center.address, field: 'address' }),
    contactNumber: resolvePiiField({
      encrypted: center.contactNumberEncrypted,
      fallback: center.contactNumber || center.officialContactInfo,
      field: 'contactNumber',
    }),
    officialContactInfo: resolvePiiField({
      encrypted: center.officialContactInfoEncrypted,
      fallback: center.officialContactInfo,
      field: 'officialContactInfo',
    }),
  };
}

function resolvePatientEmail(patient) {
  return resolvePiiField({ encrypted: patient?.emailEncrypted, fallback: patient?.email, field: 'email' });
}

function resolvePatientContact(patient) {
  return resolvePiiField({
    encrypted: patient?.contactNumberEncrypted,
    fallback: patient?.contactNumber,
    field: 'contactNumber',
  });
}

function getPatientHealthCenterAccessError(healthCenter) {
  if (!healthCenter) {
    return {
      statusCode: 409,
      message: 'This patient account is linked to a missing health center. Please contact support.',
      code: 'PATIENT_HEALTH_CENTER_MISSING',
      reason: 'Missing health center reference',
    };
  }

  return {
    statusCode: 403,
    message: 'This patient account is linked to an inactive health center. Please contact support.',
    code: 'PATIENT_HEALTH_CENTER_INACTIVE',
    reason: `Health center status is ${String(healthCenter.status ?? '').trim() || 'inactive'}`,
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

function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactCaseInsensitiveRegex(value) {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

function mapPatientDuplicateKeyError(error) {
  if (Number(error?.code) !== 11000) return null;
  const keyValue = error?.keyValue ?? {};
  if (Object.prototype.hasOwnProperty.call(keyValue, 'email') || Object.prototype.hasOwnProperty.call(keyValue, 'emailHash')) {
    return { message: 'Email already taken in this center', code: 'PATIENT_EMAIL_TAKEN' };
  }
  if (Object.prototype.hasOwnProperty.call(keyValue, 'contactNumber') || Object.prototype.hasOwnProperty.call(keyValue, 'contactNumberHash')) {
    return { message: 'Contact number already taken in this center', code: 'PATIENT_CONTACT_TAKEN' };
  }
  if (Object.prototype.hasOwnProperty.call(keyValue, 'blockchainIdentity.walletAddress')) {
    return { message: 'Wallet address already linked to another patient', code: 'PATIENT_WALLET_TAKEN' };
  }
  return { message: 'Patient account already exists', code: 'PATIENT_ALREADY_EXISTS' };
}

function clearPatientLoginMfa(patient) {
  patient.set('loginMfa.challengeId', '');
  patient.set('loginMfa.method', '');
  patient.set('loginMfa.codeHash', '');
  patient.set('loginMfa.codeExpiresAt', null);
  patient.set('loginMfa.lastSentAt', null);
  patient.set('loginMfa.attempts', 0);
}

function clearPatientPasswordReset(patient) {
  patient.set('passwordReset.method', '');
  patient.set('passwordReset.codeHash', '');
  patient.set('passwordReset.codeExpiresAt', null);
  patient.set('passwordReset.lastSentAt', null);
  patient.set('passwordReset.attempts', 0);
  patient.set('passwordReset.requestedAt', null);
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
    lastActivityAt: new Date(),
    expiresAt,
  });
}

function buildPatientLoginPayload({
  patient,
  identity,
  identityVerification,
  token,
  healthCenterSummary = null,
}) {
  return {
    accessToken: token,
    patient: {
      id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: resolvePatientEmail(patient),
      healthCenterId: patient.healthCenterId,
      assignedHealthCenter: healthCenterSummary,
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

async function issuePatientAccessToken({
  req,
  patient,
  identity,
  identityVerification,
  healthCenterSummary = null,
}) {
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

  return buildPatientLoginPayload({
    patient,
    identity,
    identityVerification,
    token,
    healthCenterSummary,
  });
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
  const normalizedLastName = String(lastName).trim();
  const normalizedFirstName = String(firstName).trim();
  const normalizedMiddleInitial = String(middleInitial ?? '').trim().slice(0, 1);
  const normalizedNameExtension = nameExtension ? String(nameExtension).trim() : '';
  const emailFields = buildEmailFields(normalizedEmail);
  const contactFields = buildPhoneFields(contactNumber);
  const mrnFields = buildMrnFields(mrn);
  const normalizedAddress = normalizeText(address);
  const normalizedContactNumber = contactFields.normalized;
  const normalizedGuardianName = normalizeText(guardianName);
  const normalizedEmergencyName = normalizeText(emergencyContactName);
  const normalizedEmergencyPhone = normalizeText(emergencyContactPhone);

  const [existingEmail, existingName, existingContact] = await Promise.all([
    Patient.findOne({ healthCenterId, emailHash: emailFields.hash }).select('_id').lean(),
    Patient.findOne({
      healthCenterId,
      lastName: exactCaseInsensitiveRegex(normalizedLastName),
      firstName: exactCaseInsensitiveRegex(normalizedFirstName),
      middleInitial: exactCaseInsensitiveRegex(normalizedMiddleInitial),
      nameExtension: exactCaseInsensitiveRegex(normalizedNameExtension),
    }).select('_id').lean(),
    Patient.findOne({ healthCenterId, contactNumberHash: contactFields.hash }).select('_id').lean(),
  ]);

  if (existingEmail) {
    return res.status(409).json({ error: { message: 'Email already taken in this center', code: 'PATIENT_EMAIL_TAKEN' } });
  }
  if (existingName) {
    return res.status(409).json({ error: { message: 'Name already taken in this center', code: 'PATIENT_NAME_TAKEN' } });
  }
  if (existingContact) {
    return res.status(409).json({
      error: {
        message: 'Contact number already taken in this center',
        code: 'PATIENT_CONTACT_TAKEN',
      },
    });
  }

  const passwordHash = await hashPassword(String(password));

  let patient;
  try {
    patient = await Patient.create({
      healthCenterId,
      mrn: '',
      mrnHash: mrnFields.hash,
      mrnEncrypted: mrnFields.encrypted,
      lastName: normalizedLastName,
      firstName: normalizedFirstName,
      middleInitial: normalizedMiddleInitial,
      nameExtension: normalizedNameExtension,
      email: '',
      emailHash: emailFields.hash,
      emailEncrypted: emailFields.encrypted,
      passwordHash,
      birthDate: normalizedBirthDate,
      sex: normalizedSex,
      address: '',
      addressEncrypted: encryptPiiValue(normalizedAddress, 'address'),
      contactNumber: '',
      contactNumberHash: contactFields.hash,
      contactNumberEncrypted: contactFields.encrypted,
      guardianName: '',
      guardianNameEncrypted: encryptPiiValue(normalizedGuardianName, 'guardianName'),
      emergencyContactName: '',
      emergencyContactNameEncrypted: encryptPiiValue(normalizedEmergencyName, 'emergencyContactName'),
      emergencyContactPhone: '',
      emergencyContactPhoneEncrypted: encryptPiiValue(normalizedEmergencyPhone, 'emergencyContactPhone'),
      role: 'patient',
      accountVerification: {
        status: 'pending',
      },
      createdByActorType: 'unknown',
    });
  } catch (error) {
    const duplicate = mapPatientDuplicateKeyError(error);
    if (duplicate) {
      return res.status(409).json({ error: duplicate });
    }
    throw error;
  }

  await writeAuditLog({
    req,
    action: 'PATIENT.REGISTER_SELF',
    entityType: 'Patient',
    entityId: patient._id,
    after: { email: normalizedEmail, verificationStatus: 'pending', blockchainIdentityQueued: true },
  });

  runDetachedTask(`patient-register:blockchain:${patient._id}`, async () => {
    const { identity } = await ensureBlockchainIdentityForDocument({
      doc: patient,
      subjectType: 'patient',
      uniqueSeed: normalizedEmail,
      walletAddress,
      healthCenterId: patient.healthCenterId,
    });
    await writeAuditLog({
      req,
      action: 'PATIENT.IDENTITY.PROVISION',
      entityType: 'Patient',
      entityId: patient._id,
      after: {
        blockchainIdentityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        txId: identity.txId,
      },
    });
  });

  return res.status(201).json({
    message: 'Registration successful. Verify your account to continue.',
    verificationRequired: true,
    patient: {
      id: patient._id,
      email: normalizedEmail,
      contactNumber: normalizedContactNumber,
      healthCenterId: patient.healthCenterId,
      assignedHealthCenter: buildHealthCenterSummary(hc),
      verification: buildVerificationSummary(patient),
      blockchainIdentity: buildQueuedBlockchainIdentityPayload(),
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

  const patientEmail = resolvePatientEmail(patient);
  const patientContact = resolvePatientContact(patient);

  if (getVerificationStatus(patient) === 'verified') {
    return res.json({
      message: 'Account already verified',
      verificationStatus: 'verified',
      method,
      recipientMasked: method === 'email' ? maskEmailAddress(patientEmail) : maskContactNumber(patientContact),
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
    email: patientEmail,
    contactNumber: patientContact,
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
        email: resolvePatientEmail(patient),
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
      email: resolvePatientEmail(patient),
    },
  });
}

export async function requestPatientPasswordResetCode(req, res) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: { message: 'email is required' } });
  }

  const emailFields = buildEmailFields(email);
  let patients = await Patient.find({
    emailHash: emailFields.hash,
    status: 'active',
    'accountVerification.status': 'verified',
  });
  if (!patients.length && emailFields.normalized) {
    patients = await Patient.find({
      email: emailFields.normalized,
      status: 'active',
      'accountVerification.status': 'verified',
    });
  }

  if (!patients.length) {
    await writeAuditLog({
      req,
      action: 'PATIENT.PASSWORD_RESET.REQUEST',
      entityType: 'Patient',
      outcome: 'failure',
      reason: 'No matching active verified patient account',
      after: { email },
    });
    return res.json({
      message: GENERIC_PASSWORD_RESET_REQUEST_MESSAGE,
    });
  }

  await Promise.all(
    patients.map(async (patient) => {
      if (!patient.emailHash || !patient.emailEncrypted) {
        patient.emailHash = emailFields.hash;
        patient.emailEncrypted = emailFields.encrypted;
        patient.email = '';
        await patient.save();
      }
    })
  );

  const retryAfterSeconds = resendCooldownRemainingSeconds(patients[0]?.passwordReset?.lastSentAt);
  if (retryAfterSeconds > 0) {
    return res.json({
      message: GENERIC_PASSWORD_RESET_REQUEST_MESSAGE,
    });
  }

  const code = generateVerificationCode();
  const codeHash = await hashPin(code);
  const expiresAt = otpExpiryDate();
  const now = new Date();

  await Promise.all(
    patients.map(async (patient) => {
      patient.set('passwordReset.method', 'email');
      patient.set('passwordReset.codeHash', codeHash);
      patient.set('passwordReset.codeExpiresAt', expiresAt);
      patient.set('passwordReset.lastSentAt', now);
      patient.set('passwordReset.attempts', 0);
      patient.set('passwordReset.requestedAt', now);
      await patient.save();
    })
  );

  const primaryPatient = patients[0];
  const patientEmail = resolvePatientEmail(primaryPatient) || email;
  const patientContact = resolvePatientContact(primaryPatient);

  const delivery = await deliverPatientVerificationCode({
    method: 'email',
    code,
    email: patientEmail,
    contactNumber: patientContact,
  });

  await Promise.all(
    patients.map((patient) =>
      writeAuditLog({
        req,
        action: 'PATIENT.PASSWORD_RESET.REQUEST',
        entityType: 'Patient',
        entityId: patient._id,
        outcome: 'success',
        after: { method: 'email', recipient: delivery.recipientMasked, expiresAt },
      })
    )
  );

  const devPreviewCode = env.NODE_ENV === 'production'
    ? ''
    : String(delivery.devPreviewCode ?? code);

  return res.json({
    message: GENERIC_PASSWORD_RESET_REQUEST_MESSAGE,
    ...(devPreviewCode ? { devPreviewCode } : {}),
  });
}

export async function resetPatientPasswordWithCode(req, res) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const code = String(req.body?.code ?? '').trim();
  const newPassword = String(req.body?.newPassword ?? '');

  if (!email || !OTP_REGEX.test(code) || !newPassword) {
    return res.status(400).json({ error: { message: 'Invalid password reset payload' } });
  }

  const passwordCheck = validatePasswordPolicy(newPassword);
  if (!passwordCheck.ok) {
    return res.status(400).json({ error: { message: passwordCheck.message } });
  }

  const emailFields = buildEmailFields(email);
  let patients = await Patient.find({
    emailHash: emailFields.hash,
    status: 'active',
    'accountVerification.status': 'verified',
  });
  if (!patients.length && emailFields.normalized) {
    patients = await Patient.find({
      email: emailFields.normalized,
      status: 'active',
      'accountVerification.status': 'verified',
    });
  }
  await Promise.all(
    patients.map(async (patient) => {
      if (!patient.emailHash || !patient.emailEncrypted) {
        patient.emailHash = emailFields.hash;
        patient.emailEncrypted = emailFields.encrypted;
        patient.email = '';
        await patient.save();
      }
    })
  );

  const now = Date.now();
  const activeChallenges = patients.filter((patient) => {
    const codeHash = String(patient.passwordReset?.codeHash ?? '').trim();
    const codeExpiresAt = patient.passwordReset?.codeExpiresAt ? new Date(patient.passwordReset.codeExpiresAt) : null;
    return Boolean(codeHash && codeExpiresAt && codeExpiresAt.getTime() >= now);
  });

  let matchedPatient = null;
  for (const patient of activeChallenges) {
    const ok = await verifyPin(code, String(patient.passwordReset?.codeHash ?? ''));
    if (ok) {
      matchedPatient = patient;
      break;
    }
  }

  if (!matchedPatient) {
    await Promise.all(
      activeChallenges.map(async (patient) => {
        const attempts = Number(patient.passwordReset?.attempts ?? 0) + 1;
        patient.set('passwordReset.attempts', attempts);
        if (attempts >= getMfaAttemptLimit()) {
          clearPatientPasswordReset(patient);
        }
        await patient.save();
      })
    );

    await writeAuditLog({
      req,
      action: 'PATIENT.PASSWORD_RESET.COMPLETE',
      entityType: 'Patient',
      outcome: 'failure',
      reason: 'Invalid or expired reset code',
      after: { email },
    });

    return res.status(401).json({
      error: {
        message: GENERIC_PASSWORD_RESET_ERROR,
        code: 'PASSWORD_RESET_INVALID',
      },
    });
  }

  matchedPatient.passwordHash = await hashPassword(newPassword);
  clearPatientPasswordReset(matchedPatient);
  clearPatientLoginMfa(matchedPatient);
  await matchedPatient.save();

  await writeAuditLog({
    req,
    action: 'PATIENT.PASSWORD_RESET.COMPLETE',
    entityType: 'Patient',
    entityId: matchedPatient._id,
    outcome: 'success',
  });

  return res.json({
    message: 'Password updated successfully. You can now log in.',
  });
}

export async function loginPatient(req, res) {
  const { email, password, mfaMethod } = req.body ?? {};

  if (!email || !password) {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  const emailFields = buildEmailFields(email);
  const normalizedEmail = emailFields.normalized;
  let patients = await Patient.find({ emailHash: emailFields.hash });
  if (!patients.length && normalizedEmail) {
    patients = await Patient.find({ email: normalizedEmail });
  }

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

  if (!match.emailHash || !match.emailEncrypted) {
    match.emailHash = emailFields.hash;
    match.emailEncrypted = emailFields.encrypted;
    match.email = '';
    await match.save();
  }

  const owningHealthCenter = await HealthCenter.findById(match.healthCenterId)
    .select('status name barangayName cityMunicipality healthCenterName address addressEncrypted contactNumber contactNumberEncrypted officialContactInfo officialContactInfoEncrypted')
    .lean();
  if (!owningHealthCenter || String(owningHealthCenter.status) !== 'active') {
    const healthCenterError = getPatientHealthCenterAccessError(owningHealthCenter);
    await writeAuditLog({
      req,
      action: 'PATIENT.LOGIN',
      entityType: 'Patient',
      entityId: match._id,
      outcome: 'failure',
      reason: healthCenterError.reason,
      after: {
        patientEmail: resolvePatientEmail(match) || normalizedEmail,
        healthCenterId: match.healthCenterId,
      },
    });
    return res.status(healthCenterError.statusCode).json({
      error: {
        message: healthCenterError.message,
        code: healthCenterError.code,
      },
    });
  }

  if (getVerificationStatus(match) !== 'verified') {
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  if (!env.PATIENT_LOGIN_MFA_REQUIRED) {
    let identity = match.blockchainIdentity ?? buildQueuedBlockchainIdentityPayload();
    try {
      ({ identity } = await ensureBlockchainIdentityForDocument({
        doc: match,
        subjectType: 'patient',
        uniqueSeed: resolvePatientEmail(match) || normalizedEmail,
        healthCenterId: match.healthCenterId,
      }));
    } catch (error) {
      if (env.NODE_ENV === 'production' || !isRecoverableBlockchainFailure(error)) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error('[PATIENT_LOGIN] Blockchain identity provisioning skipped:', resolveErrorMessage(error));
      identity = match.blockchainIdentity ?? buildQueuedBlockchainIdentityPayload();
    }

    let identityVerification;
    try {
      identityVerification = await verifyBlockchainIdentity(identity, {
        subjectType: 'patient',
        subjectId: match._id,
        healthCenterId: match.healthCenterId,
      });
    } catch (error) {
      if (env.NODE_ENV === 'production' || !isRecoverableBlockchainFailure(error)) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error('[PATIENT_LOGIN] Blockchain identity verification skipped:', resolveErrorMessage(error));
      identityVerification = buildBlockchainIdentityVerificationFallback(error);
    }

    return res.json(
      await issuePatientAccessToken({
        req,
        patient: match,
        identity,
        identityVerification,
        healthCenterSummary: buildHealthCenterSummary(owningHealthCenter),
      })
    );
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
    email: resolvePatientEmail(match) || normalizedEmail,
    contactNumber: resolvePatientContact(match),
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

  const owningHealthCenter = await HealthCenter.findById(patient.healthCenterId)
    .select('status name barangayName cityMunicipality healthCenterName address addressEncrypted contactNumber contactNumberEncrypted officialContactInfo officialContactInfoEncrypted')
    .lean();
  if (!owningHealthCenter || String(owningHealthCenter.status) !== 'active') {
    const healthCenterError = getPatientHealthCenterAccessError(owningHealthCenter);
    await writeAuditLog({
      req,
      action: 'PATIENT.LOGIN.MFA.VERIFY',
      entityType: 'Patient',
      entityId: patient._id,
      outcome: 'failure',
      reason: healthCenterError.reason,
      after: {
        patientEmail: resolvePatientEmail(patient),
        healthCenterId: patient.healthCenterId,
      },
    });
    return res.status(healthCenterError.statusCode).json({
      error: {
        message: healthCenterError.message,
        code: healthCenterError.code,
      },
    });
  }

  let identity = patient.blockchainIdentity ?? buildQueuedBlockchainIdentityPayload();
  try {
    ({ identity } = await ensureBlockchainIdentityForDocument({
      doc: patient,
      subjectType: 'patient',
      uniqueSeed: resolvePatientEmail(patient),
      healthCenterId: patient.healthCenterId,
    }));
  } catch (error) {
    if (env.NODE_ENV === 'production' || !isRecoverableBlockchainFailure(error)) {
      throw error;
    }
    // eslint-disable-next-line no-console
    console.error('[PATIENT_LOGIN_MFA_VERIFY] Blockchain identity provisioning skipped:', resolveErrorMessage(error));
    identity = patient.blockchainIdentity ?? buildQueuedBlockchainIdentityPayload();
  }

  let identityVerification;
  try {
    identityVerification = await verifyBlockchainIdentity(identity, {
      subjectType: 'patient',
      subjectId: patient._id,
      healthCenterId: patient.healthCenterId,
    });
  } catch (error) {
    if (env.NODE_ENV === 'production' || !isRecoverableBlockchainFailure(error)) {
      throw error;
    }
    // eslint-disable-next-line no-console
    console.error('[PATIENT_LOGIN_MFA_VERIFY] Blockchain identity verification skipped:', resolveErrorMessage(error));
    identityVerification = buildBlockchainIdentityVerificationFallback(error);
  }

  await writeAuditLog({
    req,
    action: 'PATIENT.LOGIN.MFA.VERIFY',
    entityType: 'Patient',
    entityId: patient._id,
    outcome: 'success',
  });

  const payload = await issuePatientAccessToken({
    req,
    patient,
    identity,
    identityVerification,
    healthCenterSummary: buildHealthCenterSummary(owningHealthCenter),
  });
  return res.json({
    ...payload,
    mfaVerified: true,
  });
}
