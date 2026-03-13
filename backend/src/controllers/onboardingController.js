import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { OnboardingFile } from '../models/OnboardingFile.js';
import { MunicipalOnboardingRequest } from '../models/MunicipalOnboardingRequest.js';
import { hashPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import { buildEmailFields } from '../services/pii.service.js';
import { deliverMunicipalOnboardingDecision } from '../services/verificationDelivery.service.js';
import { runDetachedTask } from '../utils/backgroundTask.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'municipal-onboarding');
const PASSWORD_SYMBOLS = '!@#$%^&*()-_=+[]{}:,.?';
const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const PASSWORD_NUMBERS = '23456789';
const PASSWORD_SETS = [PASSWORD_UPPER, PASSWORD_LOWER, PASSWORD_NUMBERS, PASSWORD_SYMBOLS];
const PASSWORD_ALL = `${PASSWORD_UPPER}${PASSWORD_LOWER}${PASSWORD_NUMBERS}${PASSWORD_SYMBOLS}`;

function pickRandomChar(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

function shuffleValues(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function generateTemporaryPassword() {
  const minLength = Math.max(12, Number(env.PASSWORD_MIN_LENGTH ?? 12) || 12);
  let fallback = '';

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const chars = PASSWORD_SETS.map((set) => pickRandomChar(set));
    while (chars.length < minLength) {
      chars.push(pickRandomChar(PASSWORD_ALL));
    }
    const candidate = shuffleValues(chars).join('');
    fallback = candidate;
    if (validatePasswordPolicy(candidate).ok) return candidate;
  }

  return fallback;
}

function buildSafeRegex(value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function ensureAbsolutePath(storagePath) {
  if (!storagePath) return '';
  if (path.isAbsolute(storagePath)) return storagePath;
  return path.resolve(process.cwd(), storagePath);
}

export async function uploadOnboardingFile(req, res) {
  const uploadMeta = req.uploadMeta ?? null;
  if (!uploadMeta) {
    return res.status(400).json({ error: { message: 'Upload metadata is missing' } });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: { message: 'Upload payload is required' } });
  }

  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const fileId = new mongoose.Types.ObjectId();
  const extension = path.extname(uploadMeta.fileName).slice(0, 16);
  const storageName = `${fileId}${extension}`;
  const storagePath = path.join(UPLOAD_ROOT, storageName);

  await fs.writeFile(storagePath, req.body);

  const record = await OnboardingFile.create({
    _id: fileId,
    fileName: uploadMeta.fileName,
    mimeType: uploadMeta.mimeType,
    sizeBytes: uploadMeta.sizeBytes,
    storagePath: path.relative(process.cwd(), storagePath),
    uploadedByIp: String(req.ip ?? '').trim(),
    uploadedByUserAgent: String(req.headers['user-agent'] ?? '').trim(),
  });

  return res.status(201).json({
    file: {
      id: record._id,
      fileName: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
    },
  });
}

export async function createMunicipalOnboardingRequest(req, res) {
  const {
    cityMunicipality,
    province = '',
    officeName,
    contactName,
    contactRole,
    email,
    phone,
    pricingTier = '',
    estimatedBarangays = null,
    estimatedPopulation = null,
    desiredStartDate = null,
    message = '',
    attachments = [],
  } = req.body ?? {};

  const attachmentIds = Array.from(
    new Set((attachments ?? []).map((entry) => String(entry?.fileId ?? '').trim()).filter(Boolean))
  );
  const fileDocs = attachmentIds.length
    ? await OnboardingFile.find({ _id: { $in: attachmentIds } }).lean()
    : [];

  if (attachmentIds.length && fileDocs.length !== attachmentIds.length) {
    return res.status(400).json({ error: { message: 'One or more attachment files are missing' } });
  }

  const labelById = new Map(
    (attachments ?? []).map((entry) => [String(entry?.fileId ?? '').trim(), String(entry?.label ?? '').trim()])
  );

  const attachmentPayload = fileDocs.map((file) => ({
    fileId: file._id,
    label: labelById.get(String(file._id)) ?? '',
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  }));

  const request = await MunicipalOnboardingRequest.create({
    cityMunicipality: String(cityMunicipality).trim(),
    province: String(province).trim(),
    officeName: String(officeName).trim(),
    contactName: String(contactName).trim(),
    contactRole: String(contactRole).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    pricingTier: String(pricingTier).trim(),
    estimatedBarangays: Number.isFinite(Number(estimatedBarangays)) ? Number(estimatedBarangays) : null,
    estimatedPopulation: Number.isFinite(Number(estimatedPopulation)) ? Number(estimatedPopulation) : null,
    desiredStartDate: normalizeDate(desiredStartDate),
    message: String(message ?? '').trim(),
    attachments: attachmentPayload,
    status: 'submitted',
  });

  return res.status(201).json({
    request: {
      id: request._id,
      status: request.status,
    },
  });
}

export async function listMunicipalOnboardingRequests(req, res) {
  const status = String(req.query?.status ?? '').trim().toLowerCase();
  const q = String(req.query?.q ?? '').trim();
  const limit = Math.min(Math.max(Number(req.query?.limit ?? 100), 1), 300);

  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const re = buildSafeRegex(q);
    filter.$or = [{ cityMunicipality: re }, { officeName: re }, { contactName: re }, { email: re }];
  }

  const requests = await MunicipalOnboardingRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.json({
    requests,
  });
}

export async function updateMunicipalOnboardingRequest(req, res) {
  const { applicationId } = req.params ?? {};
  const status = String(req.body?.status ?? '').trim().toLowerCase();
  const decisionNote = String(req.body?.decisionNote ?? '').trim();

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: { message: 'status must be approved or rejected' } });
  }

  const existingRequest = await MunicipalOnboardingRequest.findById(applicationId).lean();
  if (!existingRequest) {
    return res.status(404).json({ error: { message: 'Onboarding request not found' } });
  }

  let loginEmail = '';
  let temporaryPassword = '';
  let adminAccountId = null;
  let accountExisting = false;

  if (status === 'approved') {
    const normalizedEmail = String(existingRequest.email ?? '').trim().toLowerCase();
    const cityMunicipality = String(existingRequest.cityMunicipality ?? '').trim();

    if (normalizedEmail) {
      const emailFields = buildEmailFields(normalizedEmail);
      let adminDoc = await Admin.findOne({ emailHash: emailFields.hash }).lean();
      if (!adminDoc && emailFields.normalized) {
        adminDoc = await Admin.findOne({ email: emailFields.normalized }).lean();
      }

      if (adminDoc) {
        accountExisting = true;
        adminAccountId = adminDoc._id;
        loginEmail = emailFields.normalized || normalizedEmail;
      } else {
        temporaryPassword = generateTemporaryPassword();
        try {
          const admin = await Admin.create({
            email: emailFields.normalized,
            emailHash: emailFields.hash,
            emailEncrypted: emailFields.encrypted,
            passwordHash: await hashPassword(temporaryPassword),
            role: 'admin',
            status: 'active',
            scope: 'municipal',
            cityMunicipality,
          });
          adminAccountId = admin._id;
          loginEmail = emailFields.normalized;
          await writeAuditLog({
            req,
            action: 'ADMIN.ONBOARDING.ACCOUNT.CREATE',
            entityType: 'Admin',
            entityId: admin._id,
            after: {
              scope: 'municipal',
              cityMunicipality,
              applicationId: existingRequest._id,
            },
          });
        } catch (error) {
          if (error?.code === 11000) {
            const fallbackAdmin = await Admin.findOne({ emailHash: emailFields.hash }).lean();
            if (fallbackAdmin) {
              accountExisting = true;
              adminAccountId = fallbackAdmin._id;
              loginEmail = emailFields.normalized || normalizedEmail;
              temporaryPassword = '';
            }
          } else {
            throw error;
          }
        }
      }
    }
  }

  const request = await MunicipalOnboardingRequest.findByIdAndUpdate(
    applicationId,
    {
      $set: {
        status,
        decision: {
          status,
          decidedAt: new Date(),
          decidedByAdminId: req.context?.adminId ?? null,
          note: decisionNote,
        },
      },
    },
    { new: true }
  ).lean();

  let notification = null;
  if (status === 'approved') {
    runDetachedTask(`municipal-onboarding:notify:${request._id}`, async () => {
      await deliverMunicipalOnboardingDecision({
        email: request.email,
        status: request.status,
        contactName: request.contactName,
        cityMunicipality: request.cityMunicipality,
        officeName: request.officeName,
        pricingTier: request.pricingTier,
        decisionNote,
        applicationId: request._id,
        loginEmail,
        temporaryPassword,
        accountExisting,
      });
    });
    notification = { attempted: true, channel: 'queued' };
  }

  await writeAuditLog({
    req,
    action: 'ADMIN.ONBOARDING.REVIEW',
    entityType: 'MunicipalOnboardingRequest',
    entityId: request._id,
    after: {
      status: request.status,
      decisionNote,
      adminAccountId,
      credentialsIncluded: Boolean(temporaryPassword),
      accountExisting,
    },
  });

  return res.json({ request, notification });
}

export async function downloadOnboardingFile(req, res) {
  const { fileId } = req.params ?? {};
  const record = await OnboardingFile.findById(fileId).lean();
  if (!record) {
    return res.status(404).json({ error: { message: 'File not found' } });
  }

  const filePath = ensureAbsolutePath(record.storagePath);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ error: { message: 'File is missing from storage' } });
  }

  await writeAuditLog({
    req,
    action: 'ADMIN.ONBOARDING.FILE.DOWNLOAD',
    entityType: 'OnboardingFile',
    entityId: record._id,
    after: { fileName: record.fileName },
  });

  res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);
  return res.sendFile(filePath);
}
