// ── Twin Check Configuration ────────────────────────────────────────────────

export const REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000';

export const REGISTRY_ABI = [
  // ── Write ──
  'function record(address testnetAddr, address mainnetAddr, uint8 result, bytes32 reportHash, string cid) external returns (uint256 id)',

  // ── Views ──
  'function getReport(uint256 id) external view returns (tuple(address recorder, address testnetAddr, address mainnetAddr, uint8 result, bytes32 reportHash, string cid, bool byOwner, uint64 at))',
  'function latestFor(address mainnetAddr) external view returns (uint256)',
  'function reportsOf(address addr) external view returns (uint256[])',
  'function total() external view returns (uint256)',
  'function reports(uint256) external view returns (address recorder, address testnetAddr, address mainnetAddr, uint8 result, bytes32 reportHash, string cid, bool byOwner, uint64 at)',

  // ── Events ──
  'event Recorded(uint256 indexed id, address indexed mainnetAddr, uint8 result, bool byOwner)',
];

// ── Chain: BOT Chain Testnet (Bohr) ─────────────────────────────────────────
export const TESTNET_CHAIN_ID   = 968;
export const TESTNET_RPC_URL    = 'https://rpc.bohr.life';
export const TESTNET_EXPLORER   = 'https://scan.bohr.life';

// ── Chain: BOT Chain Mainnet ────────────────────────────────────────────────
export const MAINNET_CHAIN_ID   = 677;
export const MAINNET_CHAIN_HEX  = '0x2A5';
export const MAINNET_RPC_URL    = 'https://rpc.botchain.ai';
export const MAINNET_EXPLORER   = 'https://scan.botchain.ai';
export const MAINNET_SYMBOL     = 'BOT';
export const MAINNET_CHAIN_NAME = 'BOT Chain';

// ── IPFS Worker ─────────────────────────────────────────────────────────────
export const IPFS_WORKER_URL = 'https://ipfs-worker.twincheck.workers.dev';

// ── Result codes ────────────────────────────────────────────────────────────
export const RESULT = { MISMATCH: 0, NOTES: 1, MATCH: 2 };

export const RESULT_LABEL = {
  [RESULT.MISMATCH]: 'Mismatch',
  [RESULT.NOTES]:    'Match with notes',
  [RESULT.MATCH]:    'Match',
};

export const RESULT_COLOR = {
  [RESULT.MISMATCH]: 'var(--coral)',
  [RESULT.NOTES]:    'var(--butter)',
  [RESULT.MATCH]:    'var(--mint)',
};
