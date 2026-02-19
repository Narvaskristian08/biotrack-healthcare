import path from 'path';
import { promises as fs } from 'fs';
import { gzipSync } from 'zlib';
import { createHash } from 'crypto';
import { env } from '../config/env.js';
import { encryptBufferAesGcm, deriveAes256Key, resolveAes256Key } from '../utils/encryption.js';
import { Admin } from '../models/Admin.js';
import { AdminConfig } from '../models/AdminConfig.js';
import { AuditLog } from '../models/AuditLog.js';
import { BlockchainProofLog } from '../models/BlockchainProofLog.js';
import { HealthCenter } from '../models/HealthCenter.js';
import HealthRecord from '../models/HealthRecord.js';
import { Patient } from '../models/Patient.js';
import { PatientLoginHistory } from '../models/PatientLoginHistory.js';
import { PatientRecord } from '../models/PatientRecord.js';
import { RevokedToken } from '../models/RevokedToken.js';
import { Session } from '../models/Session.js';

const COLLECTION_READERS = [
  { name: 'admins', model: Admin },
  { name: 'adminConfigs', model: AdminConfig },
  { name: 'healthCenters', model: HealthCenter },
  { name: 'patients', model: Patient },
  { name: 'patientRecords', model: PatientRecord },
  { name: 'patientLoginHistory', model: PatientLoginHistory },
  { name: 'healthRecords', model: HealthRecord },
  { name: 'sessions', model: Session },
  { name: 'revokedTokens', model: RevokedToken },
  { name: 'auditLogs', model: AuditLog },
  { name: 'blockchainProofLogs', model: BlockchainProofLog },
];

let cachedBackupKey = null;

function resolveBackupKey() {
  if (cachedBackupKey) return cachedBackupKey;

  const configured = String(env.BACKUP_ENCRYPTION_KEY ?? '').trim();
  if (configured) {
    cachedBackupKey = resolveAes256Key(configured, 'BACKUP_ENCRYPTION_KEY');
    return cachedBackupKey;
  }

  if (env.NODE_ENV !== 'production') {
    cachedBackupKey = deriveAes256Key(`biotrack-dev-backup:${env.SESSION_JWT_SECRET}`);
    return cachedBackupKey;
  }

  throw new Error('BACKUP_ENCRYPTION_KEY is required in production');
}

function sanitizeFileStamp(value) {
  return String(value).replace(/[^0-9TZ:-]/g, '').replace(/[:]/g, '').replace(/\./g, '_');
}

async function readCollectionSnapshot(model, limit) {
  const docs = await model.find({}).sort({ _id: 1 }).limit(limit).lean();
  return docs;
}

export async function createEncryptedDatabaseBackup({ initiatedBy = 'system' } = {}) {
  const limit = Math.max(Number(env.BACKUP_MAX_DOCUMENTS_PER_COLLECTION ?? 5000), 100);
  const backupDir = path.resolve(process.cwd(), env.BACKUP_OUTPUT_DIR);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    initiatedBy,
    app: 'biotrack-healthcare',
    collections: {},
    counts: {},
  };

  for (const { name, model } of COLLECTION_READERS) {
    const docs = await readCollectionSnapshot(model, limit);
    snapshot.collections[name] = docs;
    snapshot.counts[name] = docs.length;
  }

  const plainJson = JSON.stringify(snapshot);
  const plainBuffer = Buffer.from(plainJson, 'utf8');
  const compressed = gzipSync(plainBuffer, { level: 9 });
  const plainChecksum = createHash('sha256').update(plainBuffer).digest('hex');

  const key = resolveBackupKey();
  const encrypted = encryptBufferAesGcm(compressed, key, 'biotrack-backup');

  const envelope = {
    schema: 'biotrack.encrypted-backup.v1',
    generatedAt: snapshot.generatedAt,
    compression: 'gzip',
    checksum: {
      plainSha256: plainChecksum,
    },
    payload: encrypted,
  };

  await fs.mkdir(backupDir, { recursive: true });
  const stamp = sanitizeFileStamp(snapshot.generatedAt);
  const fileName = `biotrack-backup-${stamp}.enc.json`;
  const filePath = path.join(backupDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(envelope), 'utf8');

  return {
    fileName,
    filePath,
    generatedAt: snapshot.generatedAt,
    counts: snapshot.counts,
    totalCollections: COLLECTION_READERS.length,
    checksum: plainChecksum,
  };
}
