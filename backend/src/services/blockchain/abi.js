export const IDENTITY_REGISTRY_ABI = [
  'function owner() view returns (address)',
  'function writers(address account) view returns (bool)',
  'function writesPaused() view returns (bool)',
  'function setWritesPaused(bool paused)',
  'function setWriter(address account, bool allowed)',
  'function transferOwnership(address newOwner)',
  'function registerIdentity(string identityId, bytes32 identityHash, string subjectType, string subjectId) returns (bytes32 proofId)',
  'function isIdentityRegistered(string identityId, bytes32 identityHash) view returns (bool)',
];

export const RECORD_PROOF_REGISTRY_ABI = [
  'function owner() view returns (address)',
  'function writers(address account) view returns (bool)',
  'function writesPaused() view returns (bool)',
  'function setWritesPaused(bool paused)',
  'function setWriter(address account, bool allowed)',
  'function transferOwnership(address newOwner)',
  'function anchorRecord(string recordId, string patientId, bytes32 recordHash, string identityId) returns (bytes32 proofId)',
  'function requestRecordExport(string recordId, bytes32 recordHash, string identityId) returns (bytes32 exportId)',
  'function verifyRecord(string recordId, bytes32 recordHash) view returns (bool verified, uint256 anchoredAt, string identityId)',
  'function isRecordHashAnchored(bytes32 recordHash) view returns (bool)',
];
