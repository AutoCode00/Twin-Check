/**
 * providers.js — ethers v6 JsonRpcProvider instances for BOT Chain networks.
 *
 * Uses window.ethers (loaded from CDN) — no npm required.
 */

const NETWORKS = {
  testnet: {
    name: 'Bohr Testnet',
    rpc: 'https://rpc.bohr.life',
    chainId: 968,
    explorer: 'https://scan.bohr.life',
    symbol: 'BOT',
  },
  mainnet: {
    name: 'BOT Chain',
    rpc: 'https://rpc.botchain.ai',
    chainId: 677,
    explorer: 'https://scan.botchain.ai',
    symbol: 'BOT',
  },
};

/** @type {Map<string, import('ethers').JsonRpcProvider>} */
const providerCache = new Map();

/**
 * Get a JsonRpcProvider for the given network.
 * @param {'testnet' | 'mainnet'} network
 * @returns {import('ethers').JsonRpcProvider}
 */
export function getProvider(network) {
  if (providerCache.has(network)) return providerCache.get(network);

  const ethers = window.ethers;
  if (!ethers) throw new Error('window.ethers is not loaded — include the ethers v6 CDN script.');

  const net = NETWORKS[network];
  if (!net) throw new Error(`Unknown network "${network}". Use "testnet" or "mainnet".`);

  const provider = new ethers.JsonRpcProvider(net.rpc, {
    name: net.name,
    chainId: net.chainId,
  });

  providerCache.set(network, provider);
  return provider;
}

/**
 * Shorthand: get the testnet (Bohr) provider.
 * @returns {import('ethers').JsonRpcProvider}
 */
export function testnetProvider() {
  return getProvider('testnet');
}

/**
 * Shorthand: get the mainnet (BOT Chain) provider.
 * @returns {import('ethers').JsonRpcProvider}
 */
export function mainnetProvider() {
  return getProvider('mainnet');
}

/**
 * Return the network metadata for the given network key.
 * @param {'testnet' | 'mainnet'} network
 */
export function getNetworkInfo(network) {
  return NETWORKS[network] ?? null;
}

export { NETWORKS };
