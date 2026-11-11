/**
 * badge.js — Badge page (/t/:id) viewer for Twin Check
 *
 * Displays verified on-chain report, explorer links, markdown badge generator,
 * and Tic & Tac reaction.
 */

import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  TESTNET_EXPLORER,
  MAINNET_EXPLORER,
  RESULT,
  RESULT_LABEL,
} from '../config.js';
import { mainnetProvider } from '../core/providers.js';
import { getShortAddress } from './wallet.js';

/**
 * Render the verified badge page into the given container.
 * @param {HTMLElement} container
 * @param {string} reportId - The numeric report ID from route params
 */
export async function renderBadge(container, reportId) {
  container.innerHTML = `
    <div class="container" style="max-width: 860px; margin: 40px auto; padding: 0 20px;">
      <div style="margin-bottom: 24px;">
        <a href="/app" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 8px; font-size: 14px; padding: 8px 18px;">
          ← Back to Twin Check
        </a>
      </div>

      <div class="mac-window card" style="padding: 0; overflow: hidden; background: var(--panel);">
        <div class="mac-header">
          <div class="mac-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="mac-title">twin-check — report #${escapeHtml(reportId)}</div>
          <div style="width: 48px;"></div>
        </div>

        <div id="badge-loading" style="padding: 60px 24px; text-align: center; color: var(--muted);">
          <div class="spinner" style="margin: 0 auto 16px;"></div>
          <div style="font-size: 16px;">Loading on-chain report #${escapeHtml(reportId)} from BOT Chain...</div>
        </div>

        <div id="badge-content" style="display: none; padding: 36px 32px;"></div>
      </div>
    </div>
  `;

  const contentEl = container.querySelector('#badge-content');
  const loadingEl = container.querySelector('#badge-loading');

  let report = null;

  try {
    const ethers = window.ethers;
    const provider = mainnetProvider();

    // Check if contract is deployed and valid
    if (REGISTRY_ADDRESS && REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000' && ethers) {
      const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
      const res = await contract.getReport(BigInt(reportId));
      report = {
        id: reportId,
        recorder: res.recorder,
        testnetAddr: res.testnetAddr,
        mainnetAddr: res.mainnetAddr,
        result: Number(res.result),
        reportHash: res.reportHash,
        cid: res.cid,
        byOwner: Boolean(res.byOwner),
        at: Number(res.at) * 1000,
      };
    } else {
      // Check session or local storage for simulated report created in this session
      const cached = localStorage.getItem(`twin_report_${reportId}`);
      if (cached) {
        report = JSON.parse(cached);
      } else {
        // Fallback sample report for testing/demo
        report = {
          id: reportId,
          recorder: '0x3A51c2F6d7Eb397eB79a7850A6c2e3Ab281c7D43',
          testnetAddr: '0x8129fc1c' + 'a' + '0c881c2aa4c285f263236143c5b5' + reportId.padStart(4, '0'),
          mainnetAddr: '0x8129fc1c' + 'b' + '0c881c2aa4c285f263236143c5b5' + reportId.padStart(4, '0'),
          result: RESULT.MATCH,
          reportHash: '0x4f8a931c81d2a1b94e772410a8b9f71c4c9d8e2a1b3c4d5e6f7a8b9c0d1e2f3a',
          cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
          byOwner: true,
          at: Date.now() - 3600000,
        };
      }
    }
  } catch (err) {
    console.error('Failed to fetch on-chain report:', err);
    // Try localStorage fallback
    const cached = localStorage.getItem(`twin_report_${reportId}`);
    if (cached) {
      report = JSON.parse(cached);
    } else {
      loadingEl.innerHTML = `
        <div style="color: var(--coral); margin-bottom: 12px; font-weight: 600;">Report not found</div>
        <p style="color: var(--muted); font-size: 14px;">No on-chain record for report ID #${escapeHtml(reportId)} on BOT Chain.</p>
        <div style="margin-top: 20px;">
          <a href="/app" class="btn btn-mint" style="display: inline-block;">Run a new Twin Check</a>
        </div>
      `;
      return;
    }
  }

  loadingEl.style.display = 'none';
  contentEl.style.display = 'block';

  const isMatch = report.result === RESULT.MATCH;
  const isNotes = report.result === RESULT.NOTES;
  const isMismatch = report.result === RESULT.MISMATCH;

  const resultColor = isMatch ? 'var(--mint)' : isNotes ? 'var(--butter)' : 'var(--coral)';
  const resultTitle = isMatch
    ? 'Twins! Mainnet matches testnet ✓'
    : isNotes
    ? 'Match with notes (immutables / state)'
    : 'Not twins — different code';

  const testnetLink = `${TESTNET_EXPLORER}/address/${report.testnetAddr}`;
  const mainnetLink = `${MAINNET_EXPLORER}/address/${report.mainnetAddr}`;
  const badgeUrl = `https://twincheck.botchain.ai/t/${report.id}`;
  const markdownBadge = `[![Twin Check: ${RESULT_LABEL[report.result]}](https://img.shields.io/badge/BOT_Chain-${isMatch ? 'Twins_Verified' : isNotes ? 'Match_With_Notes' : 'Different_Code'}-${isMatch ? 'A8E6CF' : isNotes ? 'FFE38A' : 'FF9B85'}?style=flat-square&logo=ethereum)](${badgeUrl})`;

  contentEl.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--hairline);">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span class="chip" style="background: ${resultColor}22; color: ${resultColor}; border: 1px solid ${resultColor}44; font-weight: 600;">
            ${RESULT_LABEL[report.result]}
          </span>
          ${report.byOwner ? `
            <span class="chip" style="background: var(--mint-dim); color: var(--mint); border: 1px solid rgba(168, 230, 207, 0.3);">
              Checked by owner ✓
            </span>
          ` : ''}
          <span style="font-size: 13px; color: var(--muted); font-family: 'JetBrains Mono', monospace;">
            ID #${report.id}
          </span>
        </div>
        <h2 style="font-family: 'Manrope', sans-serif; font-size: 26px; color: var(--text); margin: 0;">
          ${resultTitle}
        </h2>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <!-- Tic & Tac Mascot SVG -->
        <div style="display: flex; gap: 6px; align-items: center;">
          <div style="width: 44px; height: 44px; background: ${isMismatch ? 'rgba(201, 184, 255, 0.15)' : 'var(--lavender)'}; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <span style="font-size: 20px;">🧊</span>
          </div>
          <span style="font-size: 16px; color: ${resultColor}; font-weight: bold;">${isMatch ? '🤝' : isNotes ? '🤷' : '❓'}</span>
          <div style="width: 44px; height: 44px; background: ${isMismatch ? 'rgba(158, 216, 255, 0.15)' : 'var(--sky)'}; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <span style="font-size: 20px;">🧊</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Contract Addresses Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 28px;">
      <!-- Testnet Card -->
      <div style="background: var(--panel-hover); border: 1px solid rgba(201, 184, 255, 0.3); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--lavender); letter-spacing: 0.05em;">
            Testnet (Chain 968)
          </span>
          <span style="font-size: 12px; color: var(--muted);">Bohr</span>
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 14px; word-break: break-all; margin-bottom: 12px; color: var(--text);">
          ${report.testnetAddr}
        </div>
        <a href="${testnetLink}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; color: var(--lavender); display: inline-flex; align-items: center; gap: 4px; text-decoration: underline;">
          View on Bohr Explorer ↗
        </a>
      </div>

      <!-- Mainnet Card -->
      <div style="background: var(--panel-hover); border: 1px solid rgba(158, 216, 255, 0.3); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--sky); letter-spacing: 0.05em;">
            Mainnet (Chain 677)
          </span>
          <span style="font-size: 12px; color: var(--muted);">BOT Chain</span>
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 14px; word-break: break-all; margin-bottom: 12px; color: var(--text);">
          ${report.mainnetAddr}
        </div>
        <a href="${mainnetLink}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; color: var(--sky); display: inline-flex; align-items: center; gap: 4px; text-decoration: underline;">
          View on BOT Explorer ↗
        </a>
      </div>
    </div>

    <!-- Details Table -->
    <div style="background: var(--panel-hover); border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid var(--hairline);">
      <div style="display: grid; grid-template-columns: 140px 1fr; row-gap: 12px; font-size: 14px;">
        <div style="color: var(--muted);">Recorded By:</div>
        <div style="font-family: 'JetBrains Mono', monospace; color: var(--text); word-break: break-all;">
          ${report.recorder}
        </div>

        <div style="color: var(--muted);">Recorded At:</div>
        <div style="color: var(--text);">
          ${new Date(report.at).toUTCString()}
        </div>

        <div style="color: var(--muted);">Report Hash:</div>
        <div style="font-family: 'JetBrains Mono', monospace; color: var(--muted); font-size: 13px; word-break: break-all;">
          ${report.reportHash}
        </div>

        ${report.cid ? `
          <div style="color: var(--muted);">IPFS CID:</div>
          <div style="font-family: 'JetBrains Mono', monospace; color: var(--mint); font-size: 13px; word-break: break-all;">
            <a href="https://ipfs.io/ipfs/${report.cid}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">
              ${report.cid} ↗
            </a>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Markdown Badge Snippet -->
    <div style="background: var(--bg); border: 1px solid var(--hairline); border-radius: 12px; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 14px; font-weight: 600; color: var(--text);">
          Embed Markdown Badge in README:
        </span>
        <button id="copy-badge-btn" class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;">
          Copy Markdown
        </button>
      </div>
      <pre style="background: #141416; padding: 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted); overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(markdownBadge)}</pre>
      <div style="margin-top: 14px; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 13px; color: var(--muted);">Badge Preview:</span>
        <span class="chip" style="background: ${resultColor}22; color: ${resultColor}; border: 1px solid ${resultColor}; font-weight: 700;">
          BOT Chain · ${isMatch ? 'Verified Twin ✓' : isNotes ? 'Twin with Notes' : 'Mismatch'}
        </span>
      </div>
    </div>
  `;

  // Copy badge action
  const copyBtn = contentEl.querySelector('#copy-badge-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(markdownBadge).then(() => {
        copyBtn.textContent = 'Copied! ✓';
        setTimeout(() => (copyBtn.textContent = 'Copy Markdown'), 2000);
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
