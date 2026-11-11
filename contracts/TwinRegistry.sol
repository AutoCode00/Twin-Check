// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOwnable {
    function owner() external view returns (address);
}

/// @title TwinRegistry — on-chain record of testnet ↔ mainnet bytecode checks
/// @notice Stores comparison reports and emits events for indexing.
///         No tokens, no payments, no admin, no proxy.
contract TwinRegistry {

    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct Report {
        address recorder;      // who submitted the report
        address testnetAddr;   // contract address on testnet
        address mainnetAddr;   // contract address on mainnet
        uint8   result;        // 0 = mismatch, 1 = notes, 2 = match
        bytes32 reportHash;    // keccak256 of the off-chain JSON report
        string  cid;           // IPFS CID of the full report
        bool    byOwner;       // true when recorder == mainnetAddr.owner()
        uint64  at;            // block.timestamp at recording time
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    Report[] public reports;

    /// @dev report indices filed under a mainnet address
    mapping(address => uint256[]) private reportsForMainnet;

    /// @dev report indices filed by a recorder address
    mapping(address => uint256[]) private reportsBy;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event Recorded(
        uint256 indexed id,
        address indexed mainnetAddr,
        uint8   result,
        bool    byOwner
    );


    // ──────────────────────────────────────────────
    //  Write
    // ──────────────────────────────────────────────

    /// @notice Record a bytecode comparison report.
    /// @param testnetAddr  Contract address on the testnet chain.
    /// @param mainnetAddr  Contract address on the mainnet chain (must have code).
    /// @param result       0 = mismatch, 1 = notes, 2 = match.
    /// @param reportHash   keccak256 digest of the off-chain JSON report.
    /// @param cid          IPFS CID where the full report is pinned.
    /// @return id          Index of the newly stored report.
    function record(
        address testnetAddr,
        address mainnetAddr,
        uint8   result,
        bytes32 reportHash,
        string  calldata cid
    ) external returns (uint256 id) {
        require(mainnetAddr.code.length > 0, "TwinRegistry: mainnet address has no code");

        // Determine whether the caller is the owner of the mainnet contract
        bool byOwner = false;
        try IOwnable(mainnetAddr).owner() returns (address ownerAddr) {
            if (ownerAddr == msg.sender) {
                byOwner = true;
            }
        } catch {
            // owner() not implemented or reverted — leave byOwner false
        }

        id = reports.length;

        reports.push(Report({
            recorder:    msg.sender,
            testnetAddr: testnetAddr,
            mainnetAddr: mainnetAddr,
            result:      result,
            reportHash:  reportHash,
            cid:         cid,
            byOwner:     byOwner,
            at:          uint64(block.timestamp)
        }));

        reportsForMainnet[mainnetAddr].push(id);
        reportsBy[msg.sender].push(id);

        emit Recorded(id, mainnetAddr, result, byOwner);
    }

    // ──────────────────────────────────────────────
    //  Views
    // ──────────────────────────────────────────────

    /// @notice Return the full Report struct for a given id.
    function getReport(uint256 id) external view returns (Report memory) {
        require(id < reports.length, "TwinRegistry: report does not exist");
        return reports[id];
    }

    /// @notice Return the most recent report filed for a mainnet address.
    function latestFor(address mainnetAddr) external view returns (Report memory) {
        uint256[] storage ids = reportsForMainnet[mainnetAddr];
        require(ids.length > 0, "TwinRegistry: no reports for address");
        return reports[ids[ids.length - 1]];
    }

    /// @notice Return all report indices filed by or for a given address.
    /// @dev    Checks both reportsBy and reportsForMainnet and merges them.
    function reportsOf(address addr) external view returns (uint256[] memory) {
        uint256[] storage byRecorder  = reportsBy[addr];
        uint256[] storage forMainnet  = reportsForMainnet[addr];

        uint256 totalLen = byRecorder.length + forMainnet.length;
        if (totalLen == 0) return new uint256[](0);

        uint256[] memory merged = new uint256[](totalLen);
        uint256 idx;
        for (uint256 i; i < byRecorder.length; ++i) {
            merged[idx++] = byRecorder[i];
        }
        for (uint256 i; i < forMainnet.length; ++i) {
            merged[idx++] = forMainnet[i];
        }
        return merged;
    }

    /// @notice Total number of reports recorded.
    function total() external view returns (uint256) {
        return reports.length;
    }
}
