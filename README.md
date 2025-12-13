# 🏗️ Arc Network Experiments (Layer 1)

**A collection of smart contracts and dApps exploring the capabilities of the Arc Network Testnet.**

> "Testing the next generation of stablecoin-native blockchains."

🟢 **Live dApp:** [Launch ArcStream v2.1](https://arc-defi-experiments-evjw9ac3n-marcos-marinhos-projects.vercel.app/)

---

## 👨‍💻 About The Project

I am a final-year technology student and developer diving deep into the **Arc ecosystem**. This repository serves as my engineering log/portfolio as I explore Arc's unique features, specifically:
- **Native USDC as Gas**: Handling payable functions with stablecoins.
- **Multi-Asset Architecture**: Supporting both Native USDC and ERC-20 tokens (like EURC) in a single protocol.
- **Smart UX Patterns**: Implementing reactive UI that auto-detects `Allowance` states and handles the Approve/Create flow seamlessly.
- **Time-Based Logic**: Using `block.timestamp` for financial constraints.

**Tools used:** `Solidity 0.8.30` | `Foundry` | `Next.js` | `RainbowKit` | `Wagmi` | `Arc Testnet`

---

## 📂 Projects & Smart Contracts

### 1. 🌊 ArcStream v2.1 (Flagship)
*File: `src/ArcStream.sol` | UI: `src/app/page.tsx`*

A **Multi-Asset Payment Streaming Protocol** allowing real-time salary/vesting distribution.

- **New in v2.1:** Added support for ERC-20 tokens (Mock EURC). The dApp features a "Smart Form" that automatically swaps between **Approve** and **Create Stream** buttons based on the user's allowance status, preventing stuck UI states.
- **Logic:** Payers deposit Native USDC or Tokens, which "flow" to the recipient second-by-second.
- **Tech:** Advanced math for continuous liquidity calculation + Reactive Frontend.
- **Live Demo:** [🚀 Launch App](https://arc-defi-experiments-evjw9ac3n-marcos-marinhos-projects.vercel.app/)
- **Contract:** [View on ArcScan](https://testnet.arcscan.app/address/0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524)

### 2. 🏦 ArcTimeLock (Advanced)
*File: `src/ArcTimeLock.sol`*

A **Profit Locker Vault** designed for disciplined traders.
- **Logic:** Users can deposit Native USDC and set a custom lock-up period (in seconds).
- **Tech:** Uses `structs` to handle multiple lock positions per user and `block.timestamp` to enforce HODL periods.
- **Security:** Includes Checks-Effects-Interactions pattern to prevent reentrancy during withdrawals.

### 3. 🛡️ ArcVault (Intermediate)
*File: `src/ArcVault.sol`*

A transparent banking contract to test deposit/withdrawal flows.
- **Logic:** Simple banking system where users can store and retrieve funds.
- **Tech:** Validates the network's handling of `payable` functions using native USDC as the value carrier.
- **Outcome:** Confirmed instant state updates and low-latency block times.

### 4. 👋 HelloArchitect (Basic)
*File: `src/HelloArchitect.sol`*

The entry point.
- **Logic:** Basic state reading/writing.
- **Feature:** Implemented an interaction counter to track on-chain activity beyond simple static calls.

---

## 🚀 Deployment & Verified Contracts

All contracts have been deployed and verified on the **Arc Testnet**.

| Contract | Feature | Explorer Link |
|----------|---------|---------------|
| **ArcStream v2.1** | Multi-Asset Streaming | [View Contract](https://testnet.arcscan.app/address/0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524) |
| **ArcTimeLock** | Time-Logic / Structs | [View Contract](https://testnet.arcscan.app/address/0x2eCEeE24607F380FE5e704A3b642C574FDe1245B) |
| **ArcVault** | Payable / Mappings | [View Contract](https://testnet.arcscan.app/address/0xc57f8ac1da34a8367c8005fEdDb47cE3D41cf456) |
| **HelloArchitect** | State / Events | [View Contract](https://testnet.arcscan.app/address/0xC82827790c866A2f9b047568911686236025192E) |

---

## 🛠️ How to Run locally

### 1. Smart Contracts (Foundry)

1. **Clone the repo**
   ```bash
   git clone [https://github.com/DevJohn23/arc-defi-experiments.git]
   cd arc-defi-experiments
   ```

2. **Build**
   ```bash
   forge build
   ```

3. **Test(local)**
   ```bash
   forge test
   ```

4. **Deploy (Requires .env with ARC_TESTNET_RPC_URL and PRIVATE_KEY)**
   ```bash
   forge script script/ArcStream.s.sol --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
   ```
   
### 2. Frontend (Next.js)

1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```
   
2. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```
Open http://localhost:3000 to view the dApp.

---

**🔮 Future Goals**

My goal is to build automated DeFi solutions and trading tools specifically for the Arc ecosystem, leveraging the stability of native USDC for predictable financial modeling. Next stop: Privacy features.

---

Built by Marcos - 2025
