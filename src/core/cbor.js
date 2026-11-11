/**
 * cbor.js — Minimal CBOR decoder for Solidity metadata.
 *
 * Solidity appends a CBOR-encoded metadata block at the end of deployed
 * bytecode.  This decoder handles only the subset used there:
 *   - Major 0  unsigned int  (≤ 8 bytes)
 *   - Major 2  byte string
 *   - Major 3  text string
 *   - Major 5  map
 *
 * Everything else (arrays, tags, floats, etc.) is skipped gracefully.
 */

/**
 * Decode the leading CBOR item from `buf` starting at `offset`.
 * Returns { value, offset } where offset points past the consumed bytes.
 */
function decodeItem(buf, offset) {
  if (offset >= buf.length) throw new Error('CBOR: unexpected end of input');

  const initial = buf[offset++];
  const major = initial >> 5;
  let info = initial & 0x1f;
  let length = info;

  // Read additional-info length
  if (info === 24) {
    length = buf[offset++];
  } else if (info === 25) {
    length = (buf[offset] << 8) | buf[offset + 1];
    offset += 2;
  } else if (info === 26) {
    length =
      (buf[offset] << 24) |
      (buf[offset + 1] << 16) |
      (buf[offset + 2] << 8) |
      buf[offset + 3];
    offset += 4;
  } else if (info === 27) {
    // 8-byte int — only need lower 6 bytes for any realistic Solidity use
    length = 0;
    for (let i = 0; i < 8; i++) {
      length = length * 256 + buf[offset++];
    }
  } else if (info >= 28) {
    throw new Error('CBOR: reserved additional info ' + info);
  }

  switch (major) {
    case 0: // unsigned integer
      return { value: length, offset };

    case 1: // negative integer
      return { value: -1 - length, offset };

    case 2: { // byte string
      const bytes = buf.slice(offset, offset + length);
      offset += length;
      return { value: bytes, offset };
    }

    case 3: { // text string
      const text = new TextDecoder().decode(buf.slice(offset, offset + length));
      offset += length;
      return { value: text, offset };
    }

    case 5: { // map
      const map = {};
      for (let i = 0; i < length; i++) {
        const key = decodeItem(buf, offset);
        offset = key.offset;
        const val = decodeItem(buf, offset);
        offset = val.offset;
        map[key.value] = val.value;
      }
      return { value: map, offset };
    }

    default:
      // Skip unknown major types gracefully
      if (major === 4) {
        // array — skip items
        let o = offset;
        for (let i = 0; i < length; i++) {
          const item = decodeItem(buf, o);
          o = item.offset;
        }
        return { value: null, offset: o };
      }
      // major 6 (tag), 7 (simple/float) — skip
      return { value: null, offset };
  }
}

/**
 * Decode a CBOR-encoded Uint8Array.  Returns the first top-level value.
 * @param {Uint8Array} buf
 * @returns {*}
 */
export function decodeCBOR(buf) {
  const result = decodeItem(buf, 0);
  return result.value;
}

/**
 * Convenience: decode the Solidity metadata CBOR from a hex bytecode string.
 * Reads the last 2 bytes as big-endian CBOR length, extracts that many bytes
 * before the length field, and decodes the CBOR map.
 *
 * @param {string} hex — bytecode string (with or without 0x prefix)
 * @returns {{ solc: string|null, ipfs: Uint8Array|null, bzzr1: Uint8Array|null, raw: object, cborLength: number } | null}
 */
export function decodeSolidityMetadata(hex) {
  try {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (clean.length < 4) return null;

    // Last 2 bytes = CBOR length (in bytes)
    const cborLength = parseInt(clean.slice(-4, -2 + clean.length - (-2 + clean.length) + 2 === 0 ? undefined : -2 + clean.length), 16);
    // Simpler: last 4 hex chars = 2 bytes
    const lenHex = clean.slice(-4);
    const cborLen = parseInt(lenHex, 16);

    if (cborLen <= 0 || cborLen * 2 + 4 > clean.length) return null;

    // Extract the CBOR data
    const cborHex = clean.slice(-(cborLen * 2 + 4), -4);
    const cborBytes = new Uint8Array(cborLen);
    for (let i = 0; i < cborLen; i++) {
      cborBytes[i] = parseInt(cborHex.slice(i * 2, i * 2 + 2), 16);
    }

    const decoded = decodeCBOR(cborBytes);
    if (!decoded || typeof decoded !== 'object') return null;

    // Extract solc version
    let solcVersion = null;
    if (decoded.solc) {
      if (decoded.solc instanceof Uint8Array) {
        solcVersion = Array.from(decoded.solc)
          .map(b => b.toString())
          .join('.');
      } else if (typeof decoded.solc === 'string') {
        solcVersion = decoded.solc;
      }
    }

    // Extract IPFS hash
    let ipfsHash = null;
    if (decoded.ipfs && decoded.ipfs instanceof Uint8Array) {
      ipfsHash = decoded.ipfs;
    }

    // Extract Bzzr1 (Swarm)
    let bzzr1 = null;
    if (decoded.bzzr1 && decoded.bzzr1 instanceof Uint8Array) {
      bzzr1 = decoded.bzzr1;
    }

    return {
      solc: solcVersion,
      ipfs: ipfsHash,
      bzzr1: bzzr1,
      raw: decoded,
      cborLength: cborLen,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Format a Uint8Array as hex string.
 */
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
