export const IDENTITY_REGISTRY_ABI = [
  'function owner() view returns (address)',
  'function writers(address account) view returns (bool)',
  'function writesPaused() view returns (bool)',
  'function setWritesPaused(bool paused)',
  'function setWriter(address account, bool allowed)',
  'function transferOwnership(address newOwner)',
  'function registerIdentity(string identityId, bytes32 identityHash, string subjectType, bytes32 subjectIdHash, address walletAddress) returns (bytes32 proofId)',
  'function linkIdentityWallet(string identityId, address walletAddress)',
  'function isIdentityRegistered(string identityId, bytes32 identityHash) view returns (bool)',
  'function getIdentityWallet(string identityId) view returns (address walletAddress, bool exists)',
];

export const RECORD_PROOF_REGISTRY_ABI = [
  'function owner() view returns (address)',
  'function writers(address account) view returns (bool)',
  'function writesPaused() view returns (bool)',
  'function setWritesPaused(bool paused)',
  'function setWriter(address account, bool allowed)',
  'function transferOwnership(address newOwner)',
  'function identityRegistry() view returns (address)',
  'function setIdentityRegistry(address identityRegistryAddress)',
  'function anchorRecord(string recordId, string patientId, bytes32 recordHash, string identityId) returns (bytes32 proofId)',
  'function requestRecordExport(string recordId, bytes32 recordHash, string identityId) returns (bytes32 exportId)',
  'function verifyRecord(string recordId, bytes32 recordHash) view returns (bool verified, uint256 anchoredAt, string identityId)',
  'function isRecordHashAnchored(bytes32 recordHash) view returns (bool)',
];
