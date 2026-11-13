# Twin Check — BOT Chain Contract Parity Verification

> **Is your mainnet contract really the one you tested?**  
> Paste both addresses and get a clear answer in seconds — and a "Deploy verified" badge on BOT Chain to prove it.

---

## 🧊🧊 Meet Tic & Tac
- **Tic** (Lavender, Bohr Testnet — Chain ID `968`)
- **Tac** (Sky Blue, BOT Chain Mainnet — Chain ID `677`)

When your bytecode matches byte-by-byte, they high-five! When differing byte runs look like constructor immutables, they shrug with notes. On a mismatch, they let you know before the judges do.

---

## 🚀 Key Features

1. **Meta-Stripped Bytecode Comparison**:
   - Parses the CBOR metadata tail (solc version + IPFS compilation metadata).
   - Strips the metadata and runs a byte-by-byte comparison on pure EVM runtime bytecode.
   - Identifies immutable constructor values (20-byte address runs, 32-byte storage runs) and distinguishes them from actual code modifications.

2. **BOT Chain EVM Compatibility Audit**:
   - Walks runtime opcodes skipping immediate `PUSH1`..`PUSH32` operands.
   - Flags `PUSH0` (`0x5F`), `MCOPY` (`0x5E`), `TLOAD` (`0x5C`), and `TSTORE` (`0x5D`).
   - Alerts builders when contracts should be compiled with `evmVersion: "paris"` for BOT Chain.

3. **Side-by-Side View State Inspector**:
   - Optional ABI input (paste JSON or drop Remix compiler artifacts).
   - Simultaneously calls all zero-input `view` / `pure` methods on Bohr Testnet and BOT Chain Mainnet.
   - Displays table with match/diff indicators.

4. **On-Chain Twin Registry (`TwinRegistry.sol`)**:
   - Permanent record of verified reports on BOT Chain Mainnet.
   - Validates mainnet contract code length.
   - Verifies contract ownership dynamically via `owner()` staticcall.
   - Emits `Recorded(uint256 id, address mainnetAddr, uint8 result, bool byOwner)`.

5. **Markdown Badges & Dedicated Share Links (`/t/:id`)**:
   - Direct shareable URLs for hackathon submissions and security audits.
   - Copyable Markdown shield badge for repository README files.

---

## 🛠️ Tech Stack
- **Frontend**: Vanilla ES Modules (Zero build step, high performance)
- **Styling**: Pure CSS3 with Custom Design Tokens (Dabbit-inspired dark theme)
- **Web3**: [ethers.js v6](https://cdn.ethers.io)
- **Animations**: [GSAP 3.13+](https://greensock.com) & ScrollTrigger
- **Smart Contract**: Solidity `^0.8.20` (`evmVersion: paris`)

---

## 🌐 Network Configurations

### BOT Chain Mainnet
- **Network Name**: BOT Chain
- **Chain ID**: `677` (`0x2A5`)
- **RPC URL**: `https://rpc.botchain.ai`
- **Explorer**: `https://scan.botchain.ai`
- **Currency**: `BOT`
- **TwinRegistry Contract**: `0x54F18c0c0eB09F74251EbA461E3472f10ca93C`

### Bohr Testnet
- **Network Name**: Bohr Testnet
- **Chain ID**: `968` (`0x3C8`)
- **RPC URL**: `https://rpc.bohr.life`
- **Explorer**: `https://scan.bohr.life`
- **Currency**: `BOT`

---

## 📂 Project Architecture

```
├── index.html                 # 10 Dabbit-style marketing sections + SPA container
├── 404.html                   # GitHub Pages SPA redirect handler
├── README.md                  # Project documentation & network guides
├── contracts/
│   ├── TwinRegistry.sol       # Production Solidity contract for BOT Chain
│   └── README.md              # Deployment guide (Remix & parameters)
└── src/
    ├── main.js                # Application entry point & router bootstrap
    ├── config.js              # Network endpoints, ABIs, and registry config
    ├── core/
    │   ├── cbor.js            # Minimal zero-dependency Solidity CBOR metadata parser
    │   ├── compare.js         # Core bytecode comparison & opcode scanner
    │   └── providers.js       # Dual RPC JsonRpcProvider instances (968 & 677)
    ├── app/
    │   ├── app.js             # /app twin checker interactive checklist
    │   ├── wallet.js          # MetaMask connector & auto-switch to chain 677
    │   ├── router.js          # Client-side SPA router (/, /app, /t/:id)
    │   ├── badge.js           # /t/:id badge viewer & markdown generator
    │   └── ipfs.js            # IPFS report upload with hash fallback
    ├── animations/
    │   ├── hero.js            # Tic & Tac entrance, zip, & high-five animations
    │   ├── scroll.js          # GSAP ScrollTrigger reveals
    │   ├── report.js          # Spring checklist tick-offs & diff glows
    │   ├── result.js          # Confetti burst & mascot reaction states
    │   └── cards.js           # Micro-interactions for feature cards
    └── styles/
        └── main.css           # Complete dark-mode design system
```

---

## 💻 Local Preview
Run any local static server:
```bash
npx serve .
# or
python3 -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

