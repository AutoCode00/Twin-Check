// ── Wallet · MetaMask connection & chain management ─────────────────────────
import {
  MAINNET_CHAIN_ID, MAINNET_CHAIN_HEX, MAINNET_RPC_URL,
  MAINNET_SYMBOL, MAINNET_CHAIN_NAME, MAINNET_EXPLORER,
} from '../config.js';

let _address  = null;
let _provider = null;
let _signer   = null;

const _listeners = new Set();

// ── Public API ──────────────────────────────────────────────────────────────

/** True when a wallet account is connected. */
export function isConnected() {
  return !!_address;
}

/** Current connected address (checksummed) or null. */
export function getAddress() {
  return _address;
}

/** 0x12ab…9f3c */
export function getShortAddress(addr) {
  const a = addr || _address;
  if (!a) return '';
  return a.slice(0, 6) + '…' + a.slice(-4);
}

/** ethers v6 BrowserProvider signer. Throws if not connected. */
export async function getSigner() {
  if (!_signer) throw new Error('Wallet not connected');
  return _signer;
}

/** Register a callback for wallet state changes. */
export function onChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ── Connect ─────────────────────────────────────────────────────────────────

export async function connect() {
  const { ethers } = window;
  if (!ethers) throw new Error('ethers not loaded');

  if (!window.ethereum) {
    throw new WalletError(
      'no-metamask',
      'MetaMask is not installed. Please install MetaMask to continue.',
    );
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    if (!accounts.length) throw new WalletError('no-accounts', 'No accounts returned.');

    _provider = new ethers.BrowserProvider(window.ethereum);
    _signer   = await _provider.getSigner();
    _address  = await _signer.getAddress();

    _notify();
    return _address;
  } catch (err) {
    if (err instanceof WalletError) throw err;
    if (err.code === 4001) throw new WalletError('rejected', 'Connection request rejected.');
    throw new WalletError('connect-failed', err.message || 'Failed to connect wallet.');
  }
}

// ── Chain switching ─────────────────────────────────────────────────────────

export async function switchToBotChain() {
  if (!window.ethereum) throw new WalletError('no-metamask', 'MetaMask not installed.');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MAINNET_CHAIN_HEX }],
    });
  } catch (switchErr) {
    // 4902 = chain not added yet
    if (switchErr.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId:           MAINNET_CHAIN_HEX,
            chainName:         MAINNET_CHAIN_NAME,
            nativeCurrency:    { name: MAINNET_SYMBOL, symbol: MAINNET_SYMBOL, decimals: 18 },
            rpcUrls:           [MAINNET_RPC_URL],
            blockExplorerUrls: [MAINNET_EXPLORER],
          }],
        });
      } catch (addErr) {
        throw new WalletError('add-chain-failed', 'Could not add BOT Chain to MetaMask.');
      }
    } else if (switchErr.code === 4001) {
      throw new WalletError('rejected', 'Chain switch rejected.');
    } else {
      throw new WalletError('switch-failed', switchErr.message || 'Failed to switch chain.');
    }
  }

  // Refresh provider + signer after chain switch
  if (_address) {
    const { ethers } = window;
    _provider = new ethers.BrowserProvider(window.ethereum);
    _signer   = await _provider.getSigner();
    _notify();
  }
}

// ── Listeners for account / chain changes ───────────────────────────────────

function _initListeners() {
  if (!window.ethereum) return;

  window.ethereum.on('accountsChanged', async (accounts) => {
    if (!accounts.length) {
      _address = null;
      _signer  = null;
      _provider = null;
    } else {
      try {
        const { ethers } = window;
        _provider = new ethers.BrowserProvider(window.ethereum);
        _signer   = await _provider.getSigner();
        _address  = await _signer.getAddress();
      } catch {
        _address = null;
        _signer  = null;
      }
    }
    _notify();
  });

  window.ethereum.on('chainChanged', async () => {
    if (_address) {
      try {
        const { ethers } = window;
        _provider = new ethers.BrowserProvider(window.ethereum);
        _signer   = await _provider.getSigner();
      } catch { /* ignore */ }
    }
    _notify();
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _notify() {
  for (const fn of _listeners) {
    try { fn({ address: _address, connected: !!_address }); } catch { /* swallow */ }
  }
}

/** Custom error with a code field for UI handling. */
export class WalletError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
  }
}

// Auto-init listeners
_initListeners();

export { connect as connectWallet };

