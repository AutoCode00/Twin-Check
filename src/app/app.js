/**
 * app.js — Main App Controller for Twin Check (/app)
 *
 * Implements Step 1 (Inputs), Step 2 (Streaming Checklist Report),
 * Step 3 (On-chain Record & IPFS upload), and Report History.
 */

import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  TESTNET_EXPLORER,
  MAINNET_EXPLORER,
  TESTNET_CHAIN_ID,
  MAINNET_CHAIN_ID,
  RESULT,
  RESULT_LABEL,
} from '../config.js';
import { testnetProvider, mainnetProvider } from '../core/providers.js';
import {
  fetchBytecode,
  stripMetadata,
  compareBytecodes,
  scanOpcodes,
  getContractSize,
  checkOwner,
  fetchViewValues,
} from '../core/compare.js';
import {
  isConnected,
  getAddress,
  connectWallet,
  switchToBotChain,
  getSigner,
  getShortAddress,
  onChange as onWalletChange,
} from './wallet.js';
import { uploadReport } from './ipfs.js';
import { navigateTo } from './router.js';
import {
  animateCheckItem,
  animateCheckMark,
  animateByteDiff,
  animateValuesTable,
} from '../animations/report.js';
import {
  animateMatch,
  animateNotes,
  animateMismatch,
} from '../animations/result.js';

let appContainer = null;
let currentReportData = null;

/**
 * Render the full app view into container.
 * @param {HTMLElement} container
 */
export function renderApp(container) {
  appContainer = container;

  container.innerHTML = `
    <div class="container" style="max-width: 1040px; margin: 0 auto; padding: 20px;">

      <!-- Top Header / Navigation breadcrumb -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/" class="btn btn-outline" style="padding: 6px 14px; font-size: 13px;">
            ← Home
          </a>
          <h1 style="font-family: 'Manrope', sans-serif; font-size: 24px; margin: 0;">
            Twin Check App
          </h1>
        </div>

        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="btn-load-sample" class="btn btn-outline" style="font-size: 13px; padding: 7px 14px;">
            ⚡ Load Sample Twins
          </button>
          <button id="app-connect-btn" class="btn btn-outline" style="font-size: 13px; padding: 7px 16px;">
            Connect Wallet
          </button>
        </div>
      </div>

      <!-- Step 1: Twin Cards Inputs -->
      <div class="twin-cards-grid" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-bottom: 24px;">

        <!-- Lavender Card (Testnet) -->
        <div class="card twin-card-testnet" style="background: var(--panel); border: 1px solid rgba(201, 184, 255, 0.35); border-radius: var(--radius); padding: 24px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--lavender);"></span>
              <span style="font-size: 13px; font-weight: 700; color: var(--lavender); text-transform: uppercase; letter-spacing: 0.05em;">
                Testnet Contract
              </span>
            </div>
            <span style="font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace;">
              Bohr · Chain 968
            </span>
          </div>

          <label style="display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px;">
            Contract Address
          </label>
          <input
            id="input-testnet-addr"
            type="text"
            placeholder="0x..."
            spellcheck="false"
            style="width: 100%; background: var(--bg); border: 1px solid var(--hairline); border-radius: 8px; padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text);"
          />
          <div id="testnet-err" style="font-size: 12px; color: var(--coral); margin-top: 6px; display: none;"></div>
        </div>

        <!-- Center Swap Button & Mascots -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <div id="app-mascots" style="display: flex; gap: 4px; align-items: center;">
            <div title="Tic (Testnet)" style="width: 32px; height: 32px; background: var(--lavender); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              🧊
            </div>
            <div title="Tac (Mainnet)" style="width: 32px; height: 32px; background: var(--sky); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              🧊
            </div>
          </div>
          <button id="btn-swap-addrs" title="Swap addresses" class="btn btn-outline" style="border-radius: 50%; width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 16px;">
            ⇄
          </button>
        </div>

        <!-- Sky Card (Mainnet) -->
        <div class="card twin-card-mainnet" style="background: var(--panel); border: 1px solid rgba(158, 216, 255, 0.35); border-radius: var(--radius); padding: 24px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--sky);"></span>
              <span style="font-size: 13px; font-weight: 700; color: var(--sky); text-transform: uppercase; letter-spacing: 0.05em;">
                Mainnet Contract
              </span>
            </div>
            <span style="font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace;">
              BOT Chain · Chain 677
            </span>
          </div>

          <label style="display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px;">
            Contract Address
          </label>
          <input
            id="input-mainnet-addr"
            type="text"
            placeholder="0x..."
            spellcheck="false"
            style="width: 100%; background: var(--bg); border: 1px solid var(--hairline); border-radius: 8px; padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text);"
          />
          <div id="mainnet-err" style="font-size: 12px; color: var(--coral); margin-top: 6px; display: none;"></div>
        </div>
      </div>

      <!-- Optional ABI Accordion -->
      <div class="card" style="background: var(--panel); border: 1px solid var(--hairline); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <details id="abi-details">
          <summary style="cursor: pointer; font-size: 14px; color: var(--muted); display: flex; justify-content: space-between; align-items: center; user-select: none;">
            <span>Optional: Contract ABI (for side-by-side view value comparisons)</span>
            <span style="font-size: 12px; color: var(--lavender);">+ Add ABI</span>
          </summary>
          <div style="margin-top: 14px;">
            <p style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
              Paste contract ABI JSON or drop Remix compiler output artifact to compare no-input view functions side-by-side:
            </p>
            <textarea
              id="input-abi"
              rows="4"
              placeholder='[{"inputs":[],"name":"name","outputs":[{"type":"string"}],"stateMutability":"view","type":"function"}]'
              style="width: 100%; background: var(--bg); border: 1px solid var(--hairline); border-radius: 8px; padding: 10px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text); resize: vertical;"
            ></textarea>
          </div>
        </details>
      </div>

      <!-- Check Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <button id="btn-check-twins" class="btn btn-mint" style="padding: 14px 44px; font-size: 16px; font-weight: 700; border-radius: var(--radius-pill); box-shadow: 0 4px 20px rgba(168, 230, 207, 0.25);">
          Check Twins
        </button>
      </div>

      <!-- Swap Suggestion Alert Banner (shown when one addr has code and other doesn't) -->
      <div id="swap-suggestion" class="card" style="display: none; background: rgba(255, 227, 138, 0.1); border: 1px solid rgba(255, 227, 138, 0.4); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="color: var(--butter); font-weight: 600; font-size: 14px;">No contract on testnet — did you swap them?</span>
            <div style="font-size: 13px; color: var(--muted); margin-top: 2px;">
              The address you entered for testnet exists on mainnet instead.
            </div>
          </div>
          <button id="btn-swap-now" class="btn btn-outline" style="padding: 6px 14px; font-size: 13px; border-color: var(--butter); color: var(--butter);">
            Swap them now
          </button>
        </div>
      </div>

      <!-- Step 2: Report Container (Streaming Checklist) -->
      <div id="report-section" style="display: none; margin-bottom: 40px;">

        <!-- Result Banner -->
        <div id="result-banner" class="mac-window card" style="background: var(--panel); border-radius: var(--radius); margin-bottom: 24px; padding: 24px 28px; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div id="banner-mascot-reaction" style="font-size: 32px;">
                🧊
              </div>
              <div>
                <div id="banner-subtitle" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 700;">
                  Comparison Result
                </div>
                <h2 id="banner-title" style="font-family: 'Manrope', sans-serif; font-size: 24px; margin: 4px 0 0; color: var(--text);">
                  Analyzing...
                </h2>
                <div id="banner-desc" style="font-size: 14px; color: var(--muted); margin-top: 4px;"></div>
              </div>
            </div>

            <!-- Record Button in Banner -->
            <div id="banner-actions" style="display: none;">
              <button id="btn-record-report" class="btn btn-mint" style="padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: var(--radius-pill);">
                Record report on BOT Chain
              </button>
            </div>
          </div>
        </div>

        <!-- Checklist Rows Window -->
        <div class="mac-window card" style="background: var(--panel); border: 1px solid var(--hairline); border-radius: var(--radius); overflow: hidden;">
          <div class="mac-header">
            <div class="mac-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <div class="mac-title">twin-check — verification stream</div>
            <div style="width: 48px;"></div>
          </div>

          <div id="checklist-rows" style="padding: 12px 24px;">
            <!-- Rows will be injected here during streaming check -->
          </div>
        </div>

        <!-- Bytecode Diff Details Drawer (if differences or ranges exist) -->
        <div id="diff-drawer" style="display: none; margin-top: 24px;"></div>

        <!-- View Values Table Drawer (if ABI provided) -->
        <div id="views-drawer" style="display: none; margin-top: 24px;"></div>
      </div>

      <!-- History of Recorded Reports -->
      <div id="history-section" style="margin-top: 48px; border-top: 1px solid var(--hairline); padding-top: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-family: 'Manrope', sans-serif; font-size: 18px; margin: 0;">
            Your Recorded Twin Reports
          </h3>
          <span id="history-count" style="font-size: 13px; color: var(--muted);">0 reports</span>
        </div>
        <div id="history-list" style="display: grid; gap: 10px;">
          <!-- History items -->
        </div>
      </div>

    </div>
  `;

  setupAppEvents();
  renderHistory();
  updateWalletUi();
}

/**
 * Setup UI event listeners
 */
function setupAppEvents() {
  if (!appContainer) return;

  const btnCheck = appContainer.querySelector('#btn-check-twins');
  const btnSwap = appContainer.querySelector('#btn-swap-addrs');
  const btnSwapNow = appContainer.querySelector('#btn-swap-now');
  const btnSample = appContainer.querySelector('#btn-load-sample');
  const btnConnect = appContainer.querySelector('#app-connect-btn');
  const inputTestnet = appContainer.querySelector('#input-testnet-addr');
  const inputMainnet = appContainer.querySelector('#input-mainnet-addr');
  const inputAbi = appContainer.querySelector('#input-abi');

  // Load sample twin addresses
  btnSample?.addEventListener('click', () => {
    // Sample addresses
    inputTestnet.value = '0x5393Ec7a20c9a44c330c6a5b4625b161394aB5C5';
    inputMainnet.value = '0x5393Ec7a20c9a44c330c6a5b4625b161394aB5C5';
    inputAbi.value = JSON.stringify([
      { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
      { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
      { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
      { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }
    ], null, 2);
    appContainer.querySelector('#abi-details')?.setAttribute('open', '');
  });

  // Swap addresses
  const doSwap = () => {
    const tmp = inputTestnet.value;
    inputTestnet.value = inputMainnet.value;
    inputMainnet.value = tmp;
    appContainer.querySelector('#swap-suggestion').style.display = 'none';
  };
  btnSwap?.addEventListener('click', doSwap);
  btnSwapNow?.addEventListener('click', doSwap);

  // Connect wallet button
  btnConnect?.addEventListener('click', async () => {
    try {
      await connectWallet();
      updateWalletUi();
    } catch (err) {
      alert('Wallet connection failed: ' + err.message);
    }
  });

  onWalletChange(() => {
    updateWalletUi();
  });

  // Run Check
  btnCheck?.addEventListener('click', () => {
    runTwinCheck();
  });
}

function updateWalletUi() {
  if (!appContainer) return;
  const btn = appContainer.querySelector('#app-connect-btn');
  if (!btn) return;

  if (isConnected()) {
    btn.textContent = getShortAddress(getAddress());
    btn.classList.remove('btn-outline');
    btn.classList.add('btn-mint');
    btn.style.color = '#1B1B1E';
  } else {
    btn.textContent = 'Connect Wallet';
    btn.classList.remove('btn-mint');
    btn.classList.add('btn-outline');
    btn.style.color = '';
  }
}

/**
 * Execute the multi-step streaming twin verification
 */
async function runTwinCheck() {
  const inputTestnet = appContainer.querySelector('#input-testnet-addr');
  const inputMainnet = appContainer.querySelector('#input-mainnet-addr');
  const inputAbi = appContainer.querySelector('#input-abi');
  const swapBanner = appContainer.querySelector('#swap-suggestion');
  const reportSec = appContainer.querySelector('#report-section');
  const rowsEl = appContainer.querySelector('#checklist-rows');
  const banner = appContainer.querySelector('#result-banner');
  const bannerTitle = appContainer.querySelector('#banner-title');
  const bannerDesc = appContainer.querySelector('#banner-desc');
  const bannerEmoji = appContainer.querySelector('#banner-mascot-reaction');
  const bannerActions = appContainer.querySelector('#banner-actions');
  const diffDrawer = appContainer.querySelector('#diff-drawer');
  const viewsDrawer = appContainer.querySelector('#views-drawer');

  swapBanner.style.display = 'none';
  diffDrawer.style.display = 'none';
  viewsDrawer.style.display = 'none';
  bannerActions.style.display = 'none';

  const testnetAddr = inputTestnet.value.trim();
  const mainnetAddr = inputMainnet.value.trim();
  const abiStr = inputAbi.value.trim();

  // Basic validation
  if (!testnetAddr || !testnetAddr.startsWith('0x') || testnetAddr.length !== 42) {
    alert('Please enter a valid 42-character testnet address (0x...)');
    inputTestnet.focus();
    return;
  }
  if (!mainnetAddr || !mainnetAddr.startsWith('0x') || mainnetAddr.length !== 42) {
    alert('Please enter a valid 42-character mainnet address (0x...)');
    inputMainnet.focus();
    return;
  }

  // Setup streaming report section
  reportSec.style.display = 'block';
  rowsEl.innerHTML = '';
  bannerTitle.textContent = 'Checking contract twins...';
  bannerDesc.textContent = 'Streaming live verification checks across Bohr Testnet and BOT Chain Mainnet';
  bannerEmoji.textContent = '⏳';
  reportSec.scrollIntoView({ behavior: 'smooth' });

  const testProv = testnetProvider();
  const mainProv = mainnetProvider();

  let hasTestCode = false;
  let hasMainCode = false;
  let testCode = '0x';
  let mainCode = '0x';

  // 1. Check: Code exists on both
  const rowCode = createCheckRow('Code exists on both networks', 'Checking RPC providers...');
  rowsEl.appendChild(rowCode.element);
  animateCheckItem(rowCode.element);

  try {
    const [c1, c2] = await Promise.all([
      fetchBytecode(testnetAddr, testProv),
      fetchBytecode(mainnetAddr, mainProv),
    ]);
    testCode = c1;
    mainCode = c2;
    hasTestCode = testCode !== '0x' && testCode.length > 2;
    hasMainCode = mainCode !== '0x' && mainCode.length > 2;

    if (!hasTestCode && hasMainCode) {
      // Check if testnet address actually exists on mainnet
      const swappedCheck = await fetchBytecode(testnetAddr, mainProv);
      if (swappedCheck && swappedCheck !== '0x') {
        swapBanner.style.display = 'block';
      }
    }

    if (hasTestCode && hasMainCode) {
      rowCode.setSuccess('Code exists on both networks ✓');
    } else if (!hasTestCode && !hasMainCode) {
      rowCode.setError('No contract bytecode found at either address');
    } else if (!hasTestCode) {
      rowCode.setError(`No bytecode at ${getShortAddress(testnetAddr)} on testnet — did you swap networks?`);
    } else {
      rowCode.setError(`No bytecode at ${getShortAddress(mainnetAddr)} on mainnet — contract not yet deployed?`);
    }
  } catch (err) {
    rowCode.setError('RPC network error while fetching bytecode: ' + err.message);
  }

  if (!hasTestCode || !hasMainCode) {
    finalizeReport({
      result: RESULT.MISMATCH,
      title: 'Not twins — contract missing',
      desc: 'Bytecode could not be found on both networks. Verify your addresses.',
      emoji: '❌',
    });
    return;
  }

  // Same address note
  if (testnetAddr.toLowerCase() === mainnetAddr.toLowerCase()) {
    const rowSame = createCheckRow('Deployer address symmetry', 'Both addresses are identical (same deployer nonce) ✓', 'var(--lavender)');
    rowsEl.appendChild(rowSame.element);
    animateCheckItem(rowSame.element);
  }

  // 2. Check: Metadata strip and Compiler solc version
  const rowCompiler = createCheckRow('Compiler version & metadata', 'Extracting CBOR metadata tails...');
  rowsEl.appendChild(rowCompiler.element);
  animateCheckItem(rowCompiler.element);

  const testMeta = stripMetadata(testCode);
  const mainMeta = stripMetadata(mainCode);

  let compilerMatch = false;
  let solcTest = testMeta.metadata?.solc || null;
  let solcMain = mainMeta.metadata?.solc || null;

  if (solcTest && solcMain) {
    if (solcTest === solcMain) {
      compilerMatch = true;
      rowCompiler.setSuccess(`Solidity compiler ${solcTest} on both ✓`);
    } else {
      rowCompiler.setWarning(`Compiler versions differ: ${solcTest} (testnet) vs ${solcMain} (mainnet)`);
    }
  } else if (!testMeta.hasMetadata && !mainMeta.hasMetadata) {
    rowCompiler.setWarning('No metadata tails detected (custom optimizer/compiler settings) — comparing raw bytes');
  } else {
    rowCompiler.setWarning(`Metadata detected (Testnet: ${solcTest || 'unknown'}, Mainnet: ${solcMain || 'unknown'})`);
  }

  // 3. Check: Bytecode Comparison
  const rowBytecode = createCheckRow('Bytecode comparison', 'Comparing stripped bytecodes byte by byte...');
  rowsEl.appendChild(rowBytecode.element);
  animateCheckItem(rowBytecode.element);

  const comp = compareBytecodes(testMeta.stripped, mainMeta.stripped);

  if (comp.match && !comp.notes) {
    rowBytecode.setSuccess('Bytecode identical across all bytes (metadata stripped) ✅');
  } else if (comp.notes && comp.match) {
    rowBytecode.setWarning(`Identical except ${comp.ranges.length} byte range(s) (likely immutables / constructor parameters) 🟡`);
    renderDiffDrawer(diffDrawer, comp.ranges);
  } else {
    rowBytecode.setError(comp.statusText + ' ❌');
    renderDiffDrawer(diffDrawer, comp.ranges, comp.firstDiffOffset);
  }

  // 4. Check: BOT Chain EVM opcode compatibility
  const rowOpcodes = createCheckRow('BOT Chain compatibility', 'Scanning for PUSH0, MCOPY, TLOAD, TSTORE opcodes...');
  rowsEl.appendChild(rowOpcodes.element);
  animateCheckItem(rowOpcodes.element);

  const opMain = scanOpcodes(mainCode);
  if (opMain.warning) {
    rowOpcodes.setWarning(opMain.warning);
  } else {
    rowOpcodes.setSuccess('Compatible with BOT Chain EVM (no newer Shanghai/Cancun opcodes found) ✓');
  }

  // 5. Check: Size & 24KB limit
  const rowSize = createCheckRow('Contract size', 'Checking 24KB Spurious Dragon limit...');
  rowsEl.appendChild(rowSize.element);
  animateCheckItem(rowSize.element);

  const sizeTest = getContractSize(testCode);
  const sizeMain = getContractSize(mainCode);
  if (sizeMain.overLimit) {
    rowSize.setError(`Mainnet contract exceeds 24KB limit: ${sizeMain.bytes} bytes (${sizeMain.percentage}%)`);
  } else {
    rowSize.setSuccess(`Size: ${sizeMain.bytes.toLocaleString()} bytes (${sizeMain.percentage}% of 24KB limit) ✓`);
  }

  // 6. Check: Owner
  const rowOwner = createCheckRow('Owner verification', 'Querying owner() on both contracts...');
  rowsEl.appendChild(rowOwner.element);
  animateCheckItem(rowOwner.element);

  const [ownerTest, ownerMain] = await Promise.all([
    checkOwner(testnetAddr, testProv),
    checkOwner(mainnetAddr, mainProv),
  ]);

  let isCallerOwner = false;
  const currentWallet = getAddress();

  if (ownerMain) {
    if (currentWallet && ownerMain.toLowerCase() === currentWallet.toLowerCase()) {
      isCallerOwner = true;
      rowOwner.setSuccess(`Owner: ${getShortAddress(ownerMain)} (matches connected wallet ✓)`);
    } else if (ownerTest && ownerMain.toLowerCase() === ownerTest.toLowerCase()) {
      rowOwner.setSuccess(`Owner: ${getShortAddress(ownerMain)} on both networks ✓`);
    } else {
      rowOwner.setWarning(`Mainnet owner: ${getShortAddress(ownerMain)}${ownerTest ? ` (testnet: ${getShortAddress(ownerTest)})` : ''}`);
    }
  } else {
    rowOwner.setInfo('No public owner() method implemented');
  }

  // 7. Check: View function side-by-side (if ABI supplied)
  if (abiStr) {
    const rowViews = createCheckRow('State verification (view functions)', 'Executing no-input view functions on both...');
    rowsEl.appendChild(rowViews.element);
    animateCheckItem(rowViews.element);

    try {
      const viewResults = await fetchViewValues(testnetAddr, mainnetAddr, abiStr, testProv, mainProv);
      if (viewResults.length > 0) {
        const matchesCount = viewResults.filter(v => v.matches).length;
        rowViews.setSuccess(`${matchesCount}/${viewResults.length} view values match side-by-side ✓`);
        renderViewsDrawer(viewsDrawer, viewResults);
      } else {
        rowViews.setInfo('No zero-input view functions found in provided ABI');
      }
    } catch (e) {
      rowViews.setWarning('Could not read view values: ' + e.message);
    }
  }

  // Determine overall score
  let finalResult = RESULT.MATCH;
  let bannerTxt = 'Twins! Mainnet matches testnet ✓';
  let bannerSub = 'All verification checks passed with exact bytecode parity.';
  let emoji = '🧊🤝🧊';

  if (comp.differentCode || !comp.match) {
    finalResult = RESULT.MISMATCH;
    bannerTxt = 'Not twins — different code';
    bannerSub = 'The bytecode deployed on mainnet differs from your testnet build.';
    emoji = '🧊❓🧊';
  } else if (comp.notes || opMain.warning) {
    finalResult = RESULT.NOTES;
    bannerTxt = 'Match with notes';
    bannerSub = comp.statusText + (opMain.warning ? ` · ${opMain.warning}` : '');
    emoji = '🧊🤷🧊';
  }

  // Save report data for recording
  currentReportData = {
    testnetAddr,
    mainnetAddr,
    result: finalResult,
    timestamp: Date.now(),
    compiler: solcMain || solcTest || 'unknown',
    sizeBytes: sizeMain.bytes,
    owner: ownerMain,
    byOwner: isCallerOwner,
    diffRanges: comp.ranges,
  };

  finalizeReport({
    result: finalResult,
    title: bannerTxt,
    desc: bannerSub,
    emoji,
  });
}

function finalizeReport({ result, title, desc, emoji }) {
  const banner = appContainer.querySelector('#result-banner');
  const bannerTitle = appContainer.querySelector('#banner-title');
  const bannerDesc = appContainer.querySelector('#banner-desc');
  const bannerEmoji = appContainer.querySelector('#banner-mascot-reaction');
  const bannerActions = appContainer.querySelector('#banner-actions');
  const btnRecord = appContainer.querySelector('#btn-record-report');

  bannerTitle.textContent = title;
  bannerDesc.textContent = desc;
  bannerEmoji.textContent = emoji;

  if (result === RESULT.MATCH) {
    banner.style.borderColor = 'var(--mint)';
    bannerTitle.style.color = 'var(--mint)';
    animateMatch(banner);
  } else if (result === RESULT.NOTES) {
    banner.style.borderColor = 'var(--butter)';
    bannerTitle.style.color = 'var(--butter)';
    animateNotes(banner);
  } else {
    banner.style.borderColor = 'var(--coral)';
    bannerTitle.style.color = 'var(--coral)';
    animateMismatch(banner);
  }

  bannerActions.style.display = 'block';

  // Wire up Record button
  btnRecord.onclick = async () => {
    await recordReportOnChain(currentReportData, btnRecord);
  };
}

/**
 * Handle Record Report transaction on BOT Chain
 */
async function recordReportOnChain(reportData, recordBtn) {
  if (!reportData) return;

  if (!isConnected()) {
    try {
      await connectWallet();
      updateWalletUi();
    } catch {
      alert('Please connect MetaMask to record this report on BOT Chain.');
      return;
    }
  }

  try {
    await switchToBotChain();
  } catch (err) {
    alert('Please switch MetaMask network to BOT Chain (Chain ID 677): ' + err.message);
    return;
  }

  recordBtn.disabled = true;
  recordBtn.textContent = 'Uploading report to IPFS...';

  try {
    // 1. IPFS Upload
    const { cid, hash } = await uploadReport(reportData);

    recordBtn.textContent = 'Confirming in MetaMask...';

    const ethers = window.ethers;
    const signer = await getSigner();

    // Check if registry address is set
    if (!REGISTRY_ADDRESS || REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      // Offline / Test mock record simulation
      const mockId = String(Math.floor(Date.now() / 1000) % 10000);
      const savedReport = {
        id: mockId,
        recorder: getAddress(),
        testnetAddr: reportData.testnetAddr,
        mainnetAddr: reportData.mainnetAddr,
        result: reportData.result,
        reportHash: hash,
        cid: cid || 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        byOwner: reportData.byOwner,
        at: Date.now(),
      };
      saveReportToHistory(savedReport);
      recordBtn.textContent = 'Report Recorded! ✓';
      setTimeout(() => {
        navigateTo(`/t/${mockId}`);
      }, 800);
      return;
    }

    const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
    const tx = await registry.record(
      reportData.testnetAddr,
      reportData.mainnetAddr,
      reportData.result,
      hash,
      cid
    );

    recordBtn.textContent = 'Tx pending on BOT Chain...';
    const receipt = await tx.wait();

    // Extract report ID from Recorded event
    let recordedId = '0';
    for (const log of receipt.logs) {
      try {
        const parsed = registry.interface.parseLog(log);
        if (parsed && parsed.name === 'Recorded') {
          recordedId = parsed.args.id.toString();
          break;
        }
      } catch {}
    }

    const savedReport = {
      id: recordedId,
      recorder: getAddress(),
      testnetAddr: reportData.testnetAddr,
      mainnetAddr: reportData.mainnetAddr,
      result: reportData.result,
      reportHash: hash,
      cid,
      byOwner: reportData.byOwner,
      at: Date.now(),
    };
    saveReportToHistory(savedReport);

    recordBtn.textContent = 'Recorded! ✓';
    navigateTo(`/t/${recordedId}`);
  } catch (err) {
    console.error('Failed to record report:', err);
    alert('Failed to record report: ' + (err.reason || err.message));
    recordBtn.disabled = false;
    recordBtn.textContent = 'Record report on BOT Chain';
  }
}

function saveReportToHistory(report) {
  try {
    localStorage.setItem(`twin_report_${report.id}`, JSON.stringify(report));
    const list = JSON.parse(localStorage.getItem('twin_reports_list') || '[]');
    if (!list.includes(report.id)) {
      list.unshift(report.id);
      localStorage.setItem('twin_reports_list', JSON.stringify(list));
    }
    renderHistory();
  } catch {}
}

function renderHistory() {
  if (!appContainer) return;
  const listEl = appContainer.querySelector('#history-list');
  const countEl = appContainer.querySelector('#history-count');
  if (!listEl) return;

  const ids = JSON.parse(localStorage.getItem('twin_reports_list') || '[]');
  countEl.textContent = `${ids.length} report${ids.length === 1 ? '' : 's'}`;

  if (ids.length === 0) {
    listEl.innerHTML = `
      <div style="color: var(--muted); font-size: 13px; padding: 12px 0;">
        No reports recorded yet from this browser. Your recorded reports will appear here.
      </div>
    `;
    return;
  }

  listEl.innerHTML = ids.map(id => {
    const raw = localStorage.getItem(`twin_report_${id}`);
    if (!raw) return '';
    const item = JSON.parse(raw);
    const color = item.result === RESULT.MATCH ? 'var(--mint)' : item.result === RESULT.NOTES ? 'var(--butter)' : 'var(--coral)';
    return `
      <div class="card" style="background: var(--panel); border: 1px solid var(--hairline); border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--lavender);">
            #${item.id}
          </span>
          <span class="chip" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44; font-size: 11px;">
            ${RESULT_LABEL[item.result]}
          </span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text);">
            ${getShortAddress(item.mainnetAddr)}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 12px; color: var(--muted);">
            ${new Date(item.at).toLocaleDateString()}
          </span>
          <a href="/t/${item.id}" class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;">
            View Badge →
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function createCheckRow(title, initialStatus, accentColor = 'var(--muted)') {
  const el = document.createElement('div');
  el.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;';

  const left = document.createElement('div');
  left.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const icon = document.createElement('span');
  icon.textContent = '○';
  icon.style.color = accentColor;
  icon.style.fontSize = '16px';
  const label = document.createElement('span');
  label.textContent = title;
  label.style.fontWeight = '500';
  left.appendChild(icon);
  left.appendChild(label);

  const right = document.createElement('div');
  right.style.cssText = 'font-size: 13px; color: var(--muted); font-family: "JetBrains Mono", monospace; text-align: right;';
  right.textContent = initialStatus;

  el.appendChild(left);
  el.appendChild(right);

  return {
    element: el,
    setSuccess(text) {
      icon.textContent = '✓';
      icon.style.color = 'var(--mint)';
      right.textContent = text;
      right.style.color = 'var(--mint)';
      animateCheckMark(icon);
    },
    setWarning(text) {
      icon.textContent = '△';
      icon.style.color = 'var(--butter)';
      right.textContent = text;
      right.style.color = 'var(--butter)';
      animateCheckMark(icon);
    },
    setError(text) {
      icon.textContent = '✕';
      icon.style.color = 'var(--coral)';
      right.textContent = text;
      right.style.color = 'var(--coral)';
      animateCheckMark(icon);
    },
    setInfo(text) {
      icon.textContent = 'ℹ';
      icon.style.color = 'var(--sky)';
      right.textContent = text;
      right.style.color = 'var(--muted)';
    }
  };
}

function renderDiffDrawer(drawer, ranges, firstDiffOffset = null) {
  drawer.style.display = 'block';
  drawer.innerHTML = `
    <div class="mac-window card" style="background: var(--panel); border: 1px solid var(--hairline); border-radius: var(--radius); padding: 20px;">
      <h3 style="font-family: 'Manrope', sans-serif; font-size: 16px; margin: 0 0 12px; color: var(--text);">
        Bytecode Diff Analysis
      </h3>
      ${ranges.length > 0 ? `
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px;">
          The following byte ranges differ between testnet and mainnet stripped bytecodes:
        </p>
        <div style="display: grid; gap: 8px; max-height: 240px; overflow-y: auto;">
          ${ranges.map((r, i) => `
            <div style="background: var(--bg); border: 1px solid var(--hairline); border-radius: 8px; padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--lavender);">
                <span>Range #${i + 1} (Bytes ${r.start}..${r.end}, len: ${r.length} bytes)</span>
                <span style="color: ${r.likelyImmutable ? 'var(--mint)' : 'var(--butter)'}; font-size: 11px;">
                  ${r.likelyImmutable ? 'Constructor Immutable / Address' : 'Diff'}
                </span>
              </div>
              <div style="color: var(--lavender); margin-bottom: 2px; word-break: break-all;">
                Testnet: <span style="color: var(--text);">${r.testnet}</span>
              </div>
              <div style="color: var(--sky); word-break: break-all;">
                Mainnet: <span style="color: var(--text);">${r.mainnet}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <p style="font-size: 13px; color: var(--coral);">
          Bytecodes have different overall lengths. First mismatch detected at byte offset ${firstDiffOffset}.
        </p>
      `}
    </div>
  `;
}

function renderViewsDrawer(drawer, views) {
  drawer.style.display = 'block';
  drawer.innerHTML = `
    <div class="mac-window card" style="background: var(--panel); border: 1px solid var(--hairline); border-radius: var(--radius); padding: 20px;">
      <h3 style="font-family: 'Manrope', sans-serif; font-size: 16px; margin: 0 0 12px; color: var(--text);">
        No-Input View Values (Side-by-Side)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 12px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--hairline); text-align: left; color: var(--muted);">
            <th style="padding: 8px 12px;">Function</th>
            <th style="padding: 8px 12px; color: var(--lavender);">Testnet (Bohr)</th>
            <th style="padding: 8px 12px; color: var(--sky);">Mainnet (BOT)</th>
            <th style="padding: 8px 12px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${views.map(v => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 10px 12px; color: var(--text);">${v.name}()</td>
              <td style="padding: 10px 12px; color: var(--muted);">${v.testnetValue}</td>
              <td style="padding: 10px 12px; color: var(--muted);">${v.mainnetValue}</td>
              <td style="padding: 10px 12px;">
                <span class="chip" style="font-size: 11px; background: ${v.matches ? 'var(--mint-dim)' : 'var(--butter-dim)'}; color: ${v.matches ? 'var(--mint)' : 'var(--butter)'};">
                  ${v.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
