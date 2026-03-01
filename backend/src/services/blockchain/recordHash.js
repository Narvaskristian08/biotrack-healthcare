import { canonicalJsonStringify, sha256Hex } from '../../utils/crypto.js';

export const RECORD_HASH_SCHEMA_VERSION = 2;
export const RECORD_HASH_SCHEMA_NAME = 'biotrack.record.v2';

export function buildRecordHashLegacy({ healthCenterId, patientId, type, data }) {
  return sha256Hex(
    canonicalJsonStringify({
      healthCenterId: String(healthCenterId),
      patientId: String(patientId),
      type,
      data,
    })
  );
}

export function buildRecordHashV2({ healthCenterId, patientId, recordId, type, data, capturedAt, recordNonce }) {
  return sha256Hex(
    canonicalJsonStringify({
      schema: RECORD_HASH_SCHEMA_NAME,
      schemaVersion: RECORD_HASH_SCHEMA_VERSION,
      healthCenterId: String(healthCenterId),
      patientId: String(patientId),
      recordId: String(recordId),
      type: String(type),
      capturedAt: new Date(capturedAt).toISOString(),
      nonce: String(recordNonce),
      data,
    })
  );
}

export function buildRecordHashForRecord(record) {
  const hasV2Material =
    Number(record?.hashSchemaVersion) === RECORD_HASH_SCHEMA_VERSION &&
    String(record?.recordNonce ?? '').trim() &&
    record?.capturedAt;

  if (hasV2Material) {
    return buildRecordHashV2({
      healthCenterId: record.healthCenterId,
      patientId: record.patientId,
      recordId: record._id,
      type: record.type,
      data: record.data,
      capturedAt: record.capturedAt,
      recordNonce: record.recordNonce,
    });
  }

  return buildRecordHashLegacy({
    healthCenterId: record.healthCenterId,
    patientId: record.patientId,
    type: record.type,
    data: record.data,
  });
}
