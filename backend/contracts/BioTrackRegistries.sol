// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Risk mitigations:
 * - Access control (onlyOwner + writer roles)
 * - Replay resistance (duplicate hash rejection)
 * - Emergency controls (write pause)
 * - Input/state hardening (strict validation)
 */
contract BioTrackAccessControlled {
    address public owner;
    mapping(address => bool) public writers;
    bool public writesPaused;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event WriterUpdated(address indexed account, bool allowed);
    event WritesPausedChanged(bool paused);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyWriter() {
        require(!writesPaused, "Writes paused");
        require(msg.sender == owner || writers[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        writers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit WriterUpdated(msg.sender, true);
    }

    function setWritesPaused(bool paused) external onlyOwner {
        writesPaused = paused;
        emit WritesPausedChanged(paused);
    }

    function setWriter(address account, bool allowed) external onlyOwner {
        require(account != address(0), "Invalid account");
        writers[account] = allowed;
        emit WriterUpdated(account, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address previousOwner = owner;
        owner = newOwner;
        writers[newOwner] = true;
        emit OwnershipTransferred(previousOwner, newOwner);
        emit WriterUpdated(newOwner, true);
    }
}

contract IdentityRegistry is BioTrackAccessControlled {
    struct IdentityEntry {
        bytes32 identityHash;
        string subjectType;
        string subjectId;
        uint256 createdAt;
        bool exists;
    }

    mapping(bytes32 => IdentityEntry) private identitiesById;
    mapping(bytes32 => mapping(bytes32 => bool)) private hashByIdentityId;

    event IdentityRegistered(
        string indexed identityId,
        bytes32 indexed identityHash,
        string subjectType,
        string subjectId,
        bytes32 proofId,
        address indexed submittedBy
    );

    function registerIdentity(
        string calldata identityId,
        bytes32 identityHash,
        string calldata subjectType,
        string calldata subjectId
    ) external onlyWriter returns (bytes32 proofId) {
        require(bytes(identityId).length > 0, "identityId required");
        require(identityHash != bytes32(0), "identityHash required");
        require(bytes(subjectType).length > 0, "subjectType required");
        require(bytes(subjectId).length > 0, "subjectId required");

        bytes32 idKey = keccak256(bytes(identityId));
        require(!identitiesById[idKey].exists, "IdentityId already used");
        require(!hashByIdentityId[idKey][identityHash], "Identity already registered");

        identitiesById[idKey] = IdentityEntry({
            identityHash: identityHash,
            subjectType: subjectType,
            subjectId: subjectId,
            createdAt: block.timestamp,
            exists: true
        });
        hashByIdentityId[idKey][identityHash] = true;

        proofId = keccak256(
            abi.encodePacked(
                "IDENTITY",
                identityId,
                identityHash,
                subjectType,
                subjectId,
                block.chainid,
                block.number,
                block.timestamp,
                msg.sender
            )
        );

        emit IdentityRegistered(identityId, identityHash, subjectType, subjectId, proofId, msg.sender);
    }

    function isIdentityRegistered(string calldata identityId, bytes32 identityHash) external view returns (bool) {
        bytes32 idKey = keccak256(bytes(identityId));
        return hashByIdentityId[idKey][identityHash];
    }
}

contract RecordProofRegistry is BioTrackAccessControlled {
    struct RecordEntry {
        string patientId;
        bytes32 recordHash;
        string identityId;
        uint256 anchoredAt;
        address submittedBy;
        bool exists;
    }

    mapping(bytes32 => RecordEntry) private recordById;
    mapping(bytes32 => bool) private anchoredRecordHashes;

    event RecordAnchored(
        string indexed recordId,
        string patientId,
        bytes32 indexed recordHash,
        string identityId,
        bytes32 proofId,
        address indexed submittedBy
    );

    event RecordExportRequested(
        string indexed recordId,
        bytes32 indexed recordHash,
        string identityId,
        bytes32 exportId,
        address indexed requestedBy
    );

    function anchorRecord(
        string calldata recordId,
        string calldata patientId,
        bytes32 recordHash,
        string calldata identityId
    ) external onlyWriter returns (bytes32 proofId) {
        require(bytes(recordId).length > 0, "recordId required");
        require(bytes(patientId).length > 0, "patientId required");
        require(recordHash != bytes32(0), "recordHash required");
        require(bytes(identityId).length > 0, "identityId required");

        bytes32 recordKey = keccak256(bytes(recordId));
        require(!recordById[recordKey].exists, "Record already anchored");
        require(!anchoredRecordHashes[recordHash], "Record hash already anchored");

        recordById[recordKey] = RecordEntry({
            patientId: patientId,
            recordHash: recordHash,
            identityId: identityId,
            anchoredAt: block.timestamp,
            submittedBy: msg.sender,
            exists: true
        });
        anchoredRecordHashes[recordHash] = true;

        proofId = keccak256(
            abi.encodePacked(
                "RECORD",
                recordId,
                patientId,
                recordHash,
                identityId,
                block.chainid,
                block.number,
                block.timestamp,
                msg.sender
            )
        );

        emit RecordAnchored(recordId, patientId, recordHash, identityId, proofId, msg.sender);
    }

    /**
     * Patient-initiated export receipt.
     * This is intentionally open to any wallet so the caller pays their own network fee.
     * The call only succeeds for an already-anchored record/hash pair.
     */
    function requestRecordExport(
        string calldata recordId,
        bytes32 recordHash,
        string calldata identityId
    ) external returns (bytes32 exportId) {
        require(bytes(recordId).length > 0, "recordId required");
        require(recordHash != bytes32(0), "recordHash required");

        bytes32 recordKey = keccak256(bytes(recordId));
        RecordEntry storage entry = recordById[recordKey];
        require(entry.exists, "Record not anchored");
        require(entry.recordHash == recordHash, "Record hash mismatch");

        if (bytes(identityId).length > 0) {
            require(
                keccak256(bytes(entry.identityId)) == keccak256(bytes(identityId)),
                "Identity mismatch"
            );
        }

        exportId = keccak256(
            abi.encodePacked(
                "EXPORT",
                recordId,
                recordHash,
                entry.identityId,
                msg.sender,
                block.chainid,
                block.number,
                block.timestamp
            )
        );

        emit RecordExportRequested(recordId, recordHash, entry.identityId, exportId, msg.sender);
    }

    function isRecordHashAnchored(bytes32 recordHash) external view returns (bool) {
        return anchoredRecordHashes[recordHash];
    }

    function verifyRecord(
        string calldata recordId,
        bytes32 recordHash
    ) external view returns (bool verified, uint256 anchoredAt, string memory identityId) {
        bytes32 recordKey = keccak256(bytes(recordId));
        RecordEntry storage entry = recordById[recordKey];

        if (!entry.exists) {
            return (false, 0, "");
        }

        verified = (entry.recordHash == recordHash);
        anchoredAt = entry.anchoredAt;
        identityId = entry.identityId;
    }
}
