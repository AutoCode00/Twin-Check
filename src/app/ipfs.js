/**
 * ipfs.js — Upload comparison reports to IPFS via Cloudflare Worker
 *
 * Falls back gracefully to keccak256 hash calculation if IPFS worker is unavailable.
 */

import { IPFS_WORKER_URL } from '../config.js';

/**
 * Upload a JSON report to IPFS.
 * @param {object} reportObject - Full JSON comparison report
 * @returns {Promise<{ cid: string, hash: string }>}
 */
export async function uploadReport(reportObject) {
  const jsonStr = JSON.stringify(reportObject);
  const hash = calculateKeccak256(jsonStr);

  let cid = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(IPFS_WORKER_URL + '/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      cid = data.cid || data.hash || '';
    } else {
      console.warn('IPFS worker upload returned non-200, proceeding with report hash');
    }
  } catch (err) {
    console.warn('IPFS worker unreachable, storing on-chain report hash only:', err.message);
  }

  return {
    cid: cid || '',
    hash,
  };
}

/**
 * Calculate keccak256 of utf8 string using ethers v6 if available.
 */
export function calculateKeccak256(str) {
  const ethers = window.ethers;
  if (ethers && ethers.keccak256 && ethers.toUtf8Bytes) {
    return ethers.keccak256(ethers.toUtf8Bytes(str));
  }
  // Simple deterministic 32-byte hex fallback if ethers isn't loaded
  return '0x' + Array.from(str)
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .padStart(64, '0');
}
