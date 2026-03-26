// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Low-cost message anchoring:
 * - No state writes in setMessage (event-only anchor)
 * - Stores only a hash on-chain via log for integrity proof
 * - Bounded message size to avoid accidental high-gas payloads
 */
contract BioTrackMessageAnchor {
    uint256 public constant MAX_MESSAGE_BYTES = 280;

    event MessageAnchored(address indexed sender, bytes32 indexed messageHash);

    function setMessage(string calldata message) external {
        uint256 length = bytes(message).length;
        require(length > 0, "message required");
        require(length <= MAX_MESSAGE_BYTES, "message too long");

        bytes32 messageHash = keccak256(bytes(message));
        emit MessageAnchored(msg.sender, messageHash);
    }
}
