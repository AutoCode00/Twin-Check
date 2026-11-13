# TwinRegistry Smart Contract

Deployed on **BOT Chain Mainnet** (Chain ID: `677`).

## Contract Overview
- **Solidity Version**: `^0.8.20`
- **EVM Version**: `paris` (Ensure PUSH0 opcode is disabled when compiling for BOT Chain)
- **License**: MIT
- **Features**:
  - `record(address testnetAddr, address mainnetAddr, uint8 result, bytes32 reportHash, string cid)`
  - `getReport(uint256 id)`
  - `latestFor(address mainnetAddr)`
  - `reportsOf(address addr)`
  - `total()`

## Deployment Networks

### BOT Chain Mainnet
- **Chain ID**: `677` (`0x2A5`)
- **RPC URL**: `https://rpc.botchain.ai`
- **Explorer**: `https://scan.botchain.ai`
- **Currency Symbol**: `BOT`

### Bohr Testnet
- **Chain ID**: `968` (`0x3C8`)
- **RPC URL**: `https://rpc.bohr.life`
- **Explorer**: `https://scan.bohr.life`
- **Currency Symbol**: `BOT`

## Remix Deployment Steps
1. Open [Remix IDE](https://remix.ethereum.org/).
2. Create `TwinRegistry.sol` and paste the contract code from `contracts/TwinRegistry.sol`.
3. In the Solidity Compiler tab:
   - Compiler: `0.8.24` (or `0.8.20`)
   - Advanced Configurations -> EVM Version: **paris**
4. In the Deploy & Run Transactions tab:
   - Environment: **Injected Provider - MetaMask**
   - Connect to BOT Chain Mainnet (Chain ID `677`)
   - Click **Deploy**
5. Copy the deployed contract address and paste it in `src/config.js` (`REGISTRY_ADDRESS`).

