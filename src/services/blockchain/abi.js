export const IDENTITY_REGISTRY_ABI = [
  'function registerIdentity(string identityId, bytes32 identityHash, string subjectType, string subjectId) returns (bytes32 proofId)',
  'function isIdentityRegistered(string identityId, bytes32 identityHash) view returns (bool)',
];

export const RECORD_PROOF_REGISTRY_ABI = [
  'function anchorRecord(string recordId, string patientId, bytes32 recordHash, string identityId) returns (bytes32 proofId)',
  'function verifyRecord(string recordId, bytes32 recordHash) view returns (bool verified, uint256 anchoredAt, string identityId)',
];
