/**
 * compare.js — Core comparison logic for Twin Check
 *
 * Implements:
 * - Fetching bytecode from testnet and mainnet providers
 * - Solidity metadata extraction and stripping (CBOR tail)
 * - Byte-by-byte comparison and differing range detection (immutables/constructor values)
 * - EVM opcode scanning (PUSH0, MCOPY, TLOAD, TSTORE)
 * - Contract size & 24KB Spurious Dragon limit calculation
 * - Owner lookup on both contracts
 * - View function reading side by side (Promise.allSettled)
 */

import { decodeSolidityMetadata } from './cbor.js';

/**
 * Fetch raw runtime bytecode for an address.
 * @param {string} address - Checksum or lowercase 0x address
 * @param {import('ethers').Provider} provider - Ethers provider
 * @returns {Promise<string>} Hex bytecode string starting with '0x'
 */
export async function fetchBytecode(address, provider) {
  if (!address || !provider) return '0x';
  try {
    const code = await provider.getCode(address);
    return code || '0x';
  } catch (err) {
    console.error(`Error fetching bytecode for ${address}:`, err);
    throw err;
  }
}

/**
 * Strip Solidity CBOR metadata from runtime bytecode.
 * @param {string} bytecode - Hex bytecode string
 * @returns {{ stripped: string, metadata: object|null, metadataHex: string, hasMetadata: boolean }}
 */
export function stripMetadata(bytecode) {
  const clean = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
  if (!clean || clean.length < 4) {
    return { stripped: '0x', metadata: null, metadataHex: '', hasMetadata: false };
  }

  const meta = decodeSolidityMetadata(clean);
  if (meta && meta.cborLength) {
    const totalMetaChars = meta.cborLength * 2 + 4; // CBOR bytes * 2 + 2 bytes (4 hex chars) length field
    if (clean.length >= totalMetaChars) {
      const strippedHex = clean.slice(0, clean.length - totalMetaChars);
      const metadataHex = clean.slice(clean.length - totalMetaChars);
      return {
        stripped: '0x' + strippedHex,
        metadata: meta,
        metadataHex: '0x' + metadataHex,
        hasMetadata: true,
      };
    }
  }

  // Fallback: check last 2 bytes as potential CBOR length
  const last2BytesHex = clean.slice(-4);
  const possibleLen = parseInt(last2BytesHex, 16);
  const possibleTotalChars = possibleLen * 2 + 4;
  if (possibleLen > 0 && possibleLen < 200 && clean.length > possibleTotalChars) {
    return {
      stripped: '0x' + clean.slice(0, clean.length - possibleTotalChars),
      metadata: null,
      metadataHex: '0x' + clean.slice(clean.length - possibleTotalChars),
      hasMetadata: true,
    };
  }

  // No identifiable metadata tail
  return {
    stripped: '0x' + clean,
    metadata: null,
    metadataHex: '',
    hasMetadata: false,
  };
}

/**
 * Scan bytecode for newer EVM opcodes that may be unsupported on BOT Chain.
 * Walks opcode bytes, skipping PUSH1..PUSH32 data bytes.
 *
 * Checks:
 * - 0x5F: PUSH0 (Shanghai)
 * - 0x5E: MCOPY (Cancun)
 * - 0x5C: TLOAD (Cancun)
 * - 0x5D: TSTORE (Cancun)
 *
 * @param {string} bytecode - Hex bytecode
 * @returns {{
 *   hasPush0: boolean,
 *   hasMcopy: boolean,
 *   hasTload: boolean,
 *   hasTstore: boolean,
 *   opcodes: Array<{ opcode: string, hex: string, offset: number }>,
 *   warning: string|null
 * }}
 */
export function scanOpcodes(bytecode) {
  const clean = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
  const opcodes = [];
  let hasPush0 = false;
  let hasMcopy = false;
  let hasTload = false;
  let hasTstore = false;

  const len = clean.length;
  let byteIndex = 0;

  for (let i = 0; i < len; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);

    // Check target opcodes
    if (byte === 0x5f) {
      hasPush0 = true;
      opcodes.push({ opcode: 'PUSH0', hex: '0x5f', offset: byteIndex });
    } else if (byte === 0x5e) {
      hasMcopy = true;
      opcodes.push({ opcode: 'MCOPY', hex: '0x5e', offset: byteIndex });
    } else if (byte === 0x5c) {
      hasTload = true;
      opcodes.push({ opcode: 'TLOAD', hex: '0x5c', offset: byteIndex });
    } else if (byte === 0x5d) {
      hasTstore = true;
      opcodes.push({ opcode: 'TSTORE', hex: '0x5d', offset: byteIndex });
    }

    // PUSH1 (0x60) through PUSH32 (0x7f) skip immediate data bytes
    if (byte >= 0x60 && byte <= 0x7f) {
      const pushBytes = byte - 0x5f; // 1 to 32
      i += pushBytes * 2;
      byteIndex += pushBytes;
    }

    byteIndex++;
  }

  let warning = null;
  const warnings = [];
  if (hasPush0) {
    warnings.push('Uses PUSH0 — compile with evmVersion paris if transactions fail on BOT Chain');
  }
  if (hasMcopy) {
    warnings.push('Uses MCOPY — not supported on paris EVM');
  }
  if (hasTload || hasTstore) {
    warnings.push('Uses transient storage (TLOAD/TSTORE) — not supported on paris EVM');
  }
  if (warnings.length > 0) {
    warning = warnings.join('. ');
  }

  return {
    hasPush0,
    hasMcopy,
    hasTload,
    hasTstore,
    opcodes,
    warning,
  };
}

/**
 * Compare two bytecodes byte-by-byte (after metadata stripping).
 *
 * @param {string} testnetCode - Testnet runtime bytecode
 * @param {string} mainnetCode - Mainnet runtime bytecode
 * @returns {{
 *   match: boolean,
 *   notes: boolean,
 *   differentCode: boolean,
 *   ranges: Array<{ start: number, end: number, length: number, testnet: string, mainnet: string, likelyImmutable: boolean }>,
 *   firstDiffOffset: number|null,
 *   sizeA: number,
 *   sizeB: number,
 *   sizeDiff: number,
 *   statusText: string
 * }}
 */
export function compareBytecodes(testnetCode, mainnetCode) {
  const cleanA = testnetCode.startsWith('0x') ? testnetCode.slice(2) : testnetCode;
  const cleanB = mainnetCode.startsWith('0x') ? mainnetCode.slice(2) : mainnetCode;

  const sizeA = cleanA.length / 2;
  const sizeB = cleanB.length / 2;
  const sizeDiff = Math.abs(sizeA - sizeB);

  // If sizes differ, they cannot be identical bytecode
  if (sizeA !== sizeB) {
    let firstDiff = -1;
    const minLen = Math.min(cleanA.length, cleanB.length);
    for (let i = 0; i < minLen; i += 2) {
      if (cleanA.slice(i, i + 2) !== cleanB.slice(i, i + 2)) {
        firstDiff = i / 2;
        break;
      }
    }
    if (firstDiff === -1) firstDiff = minLen / 2;

    return {
      match: false,
      notes: false,
      differentCode: true,
      ranges: [],
      firstDiffOffset: firstDiff,
      sizeA,
      sizeB,
      sizeDiff,
      statusText: `Different code — size differs by ${sizeDiff} bytes (first difference at byte offset ${firstDiff})`,
    };
  }

  // Equal length — compare byte by byte
  const ranges = [];
  let currentRange = null;

  for (let i = 0; i < cleanA.length; i += 2) {
    const byteA = cleanA.slice(i, i + 2);
    const byteB = cleanB.slice(i, i + 2);
    const offset = i / 2;

    if (byteA !== byteB) {
      if (!currentRange) {
        currentRange = {
          start: offset,
          end: offset,
          testnetBytes: [byteA],
          mainnetBytes: [byteB],
        };
      } else {
        currentRange.end = offset;
        currentRange.testnetBytes.push(byteA);
        currentRange.mainnetBytes.push(byteB);
      }
    } else {
      if (currentRange) {
        finalizeRange(currentRange, ranges);
        currentRange = null;
      }
    }
  }

  if (currentRange) {
    finalizeRange(currentRange, ranges);
  }

  // Exactly identical
  if (ranges.length === 0) {
    return {
      match: true,
      notes: false,
      differentCode: false,
      ranges: [],
      firstDiffOffset: null,
      sizeA,
      sizeB,
      sizeDiff: 0,
      statusText: 'Identical bytecode (metadata stripped)',
    };
  }

  // Diff ranges exist — check if they look like immutables (20-byte addresses or 32-byte values)
  const allLikelyImmutables = ranges.every(r => r.likelyImmutable);

  return {
    match: allLikelyImmutables,
    notes: true,
    differentCode: !allLikelyImmutables,
    ranges,
    firstDiffOffset: ranges[0]?.start ?? null,
    sizeA,
    sizeB,
    sizeDiff: 0,
    statusText: allLikelyImmutables
      ? `Identical except ${ranges.length} byte range${ranges.length > 1 ? 's' : ''} (likely constructor immutables or address parameters)`
      : `Different code — ${ranges.length} differing byte ranges found`,
  };
}

function finalizeRange(r, list) {
  const length = r.end - r.start + 1;
  // 20-byte run = address, 32-byte run = uint256 / bytes32
  const likelyImmutable = (length === 20 || length === 32 || length === 64 || (length % 32 === 0));
  list.push({
    start: r.start,
    end: r.end,
    length,
    testnet: '0x' + r.testnetBytes.join(''),
    mainnet: '0x' + r.mainnetBytes.join(''),
    likelyImmutable,
  });
}

/**
 * Calculate contract size and percentage of 24 KB Spurious Dragon limit (24,576 bytes).
 * @param {string} bytecode - Hex bytecode
 * @returns {{ bytes: number, limit: number, percentage: number, overLimit: boolean }}
 */
export function getContractSize(bytecode) {
  const clean = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
  const bytes = clean.length / 2;
  const limit = 24576; // 24 * 1024
  const percentage = Math.min(100, parseFloat(((bytes / limit) * 100).toFixed(2)));
  return {
    bytes,
    limit,
    percentage,
    overLimit: bytes > limit,
  };
}

/**
 * Check contract owner by staticcalling owner().
 * @param {string} address - Contract address
 * @param {import('ethers').Provider} provider - Ethers provider
 * @returns {Promise<string|null>} Checksummed owner address, or null if unsupported
 */
export async function checkOwner(address, provider) {
  if (!address || !provider) return null;
  const ethers = window.ethers;
  if (!ethers) return null;

  try {
    const code = await provider.getCode(address);
    if (!code || code === '0x') return null;

    // owner() selector is 0x8da5cb5b
    const callData = '0x8da5cb5b';
    const result = await provider.call({
      to: address,
      data: callData,
    });

    if (result && result !== '0x' && result.length >= 66) {
      const rawAddr = '0x' + result.slice(-40);
      if (rawAddr !== '0x0000000000000000000000000000000000000000') {
        return ethers.getAddress(rawAddr);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Call all zero-input view/pure functions on both testnet & mainnet contracts.
 * @param {string} testnetAddr - Contract address on testnet
 * @param {string} mainnetAddr - Contract address on mainnet
 * @param {Array|string} rawAbi - Contract ABI (array or JSON string)
 * @param {import('ethers').Provider} testnetProv
 * @param {import('ethers').Provider} mainnetProv
 * @returns {Promise<Array<{ name: string, testnetValue: string, mainnetValue: string, matches: boolean, status: string }>>}
 */
export async function fetchViewValues(testnetAddr, mainnetAddr, rawAbi, testnetProv, mainnetProv) {
  const ethers = window.ethers;
  if (!ethers) return [];

  let abi = rawAbi;
  if (typeof abi === 'string') {
    try {
      const parsed = JSON.parse(abi);
      abi = parsed.abi || parsed;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(abi)) return [];

  // Filter 0-input view/pure functions
  const viewFns = abi.filter(item => {
    return (
      item.type === 'function' &&
      (item.stateMutability === 'view' || item.stateMutability === 'pure') &&
      (!item.inputs || item.inputs.length === 0)
    );
  });

  if (viewFns.length === 0) return [];

  const testnetContract = new ethers.Contract(testnetAddr, abi, testnetProv);
  const mainnetContract = new ethers.Contract(mainnetAddr, abi, mainnetProv);

  const results = await Promise.all(
    viewFns.map(async fn => {
      const name = fn.name;
      let valTest = null;
      let valMain = null;
      let errTest = false;
      let errMain = false;

      try {
        const res = await testnetContract[name]();
        valTest = formatValue(res);
      } catch (e) {
        valTest = 'reverted';
        errTest = true;
      }

      try {
        const res = await mainnetContract[name]();
        valMain = formatValue(res);
      } catch (e) {
        valMain = 'reverted';
        errMain = true;
      }

      const matches = !errTest && !errMain && valTest === valMain;

      return {
        name,
        testnetValue: valTest,
        mainnetValue: valMain,
        matches,
        status: matches ? 'Identical' : 'Different state',
      };
    })
  );

  return results;
}

/**
 * Format any returned value into safe string representation (handles BigInt, arrays, bytes).
 */
function formatValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return '[' + v.map(formatValue).join(', ') + ']';
  }
  if (typeof v === 'object') {
    try {
      // ethers Result object
      if (v.toArray) {
        return '[' + v.toArray().map(formatValue).join(', ') + ']';
      }
      return JSON.stringify(v, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
    } catch {
      return String(v);
    }
  }
  return String(v);
}
