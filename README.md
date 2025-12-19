# 🏗️ Arc DeFi Suite (v2.0)

**A professional-grade suite of DeFi primitives and dApps exploring the capabilities of the Arc Network Testnet.**

> "Testing the next generation of stablecoin-native blockchains with premium UX."

🟢 **Live dApp:** [Launch Arc DeFi Suite](https://arc-defi-experiments.vercel.app/)

---

## 👨‍💻 About The Project

I am a final-year technology student and developer diving deep into the **Arc ecosystem**. This repository serves as my engineering log/portfolio as I build production-ready primitives for Arc.

**The v2.0 Update (Current Release):**
The project has evolved into a unified **"Glassmorphism" Dashboard**, fully supporting multi-currency operations (**USDC & EURC**) across all dApps.

**Key Explorations:**
- **Native USDC as Gas:** Mastering `payable` flows with 18-decimal stablecoins.
- **Hybrid Asset Architecture:** A unified interface supporting both Native USDC and standard ERC-20 tokens (EURC).
- **Mock Liquidity Environments:** Implementing custom **MockSwaps** to test trading logic without relying on unstable testnet pools.
- **Client-Side Privacy:** Implementing off-chain hashing (`keccak256`) to secure secrets before they reach the mempool.

**Tools used:** `Solidity 0.8.30` | `Foundry` | `Next.js` | `RainbowKit` | `Wagmi` | `Viem` | `Canvas Confetti`

---

## 📂 Projects & Smart Contracts

### 1. 🤖 ArcDCA (New Flagship)
*File: `src/ArcDCA.sol` | UI: `Tabs/Auto-Trade`*

A **Dollar Cost Averaging (DCA) Vault** with an interactive dashboard.
- **Mock Integration:** Solves testnet liquidity issues by routing trades through a custom **MockSwap** contract (USDC/EURC -> WETH).
- **Dual-Currency Engine:** Users can seamlessly create vaults using **Native USDC** or **EURC**.
- **Visual Dashboard:** Tracks active positions, balances, and next execution times in real-time.
- **"Force Run" Logic:** Includes a manual trigger allowing users/devs to execute swaps on-chain instantly for validation (bypassing CRON jobs).

### 2. 🌊 ArcStream v2.1
*File: `src/ArcStream.sol` | UI: `Tabs/ArcStream`*

A **Multi-Asset Payment Streaming Protocol** allowing real-time salary/vesting distribution.
- **Features:** "Smart Form" UX that automatically toggles between **Approve** (ERC-20) and **Create** (Native) flows based on asset selection.
- **Logic:** Continuous liquidity calculation allowing second-by-second withdrawals.
- **Status:** Live & Stable.

### 3. 🔗 ArcLink
*File: `src/ArcLink.sol` | UI: `Tabs/ArcLink`*

A **"Cash App" style Payment Link system**.
- **Problem Solved:** Allows sending crypto to users via WhatsApp/Discord before they even connect a wallet.
- **Tech Stack:**
    - **Dual-Mode Contract:** Handles `msg.value` for Native USDC and `transferFrom` for EURC in a single component.
    - **Zero-Knowledge Secrets:** The password is hashed on the client-side. The contract only verifies the hash, ensuring the plain-text key is never exposed on-chain.

### 4. 🏦 Legacy Primitives
- **ArcTimeLock:** A Profit Locker Vault for disciplined trading with time constraints.
- **ArcVault:** A transparent banking contract to test deposit/withdrawal flows.

---

## 🚀 Deployment & Verified Contracts

All contracts are deployed and verified on the **Arc Testnet**.

| Contract | Feature | Explorer Link |
|----------|---------|---------------|
| **ArcDCA** | **Auto-Invest / MockSwap** | [View Contract](https://testnet.arcscan.app/address/0xEbbb3e8630D69ab25Cf55A4B78cf94cE9F3d376A) |
| **ArcStream** | Streaming / Payroll | [View Contract](https://testnet.arcscan.app/address/0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524) |
| **ArcLink** | Payment Links | [View Contract](https://testnet.arcscan.app/address/0x74D27f868FA5253D89e9C65527aD3397860bEE8e) |
| **MockSwap** | Liquidity Simulation | [View Contract](https://testnet.arcscan.app/address/0xdaB8B474d6BC63A44e410f8174E796130988F7eD) |

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
   forge script script/DeployAll.s.sol --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
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

With the core payment primitives and trading tools complete, my next focus is on Privacy Layers and exploring Order Book logic within the Arc ecosystem.
---

Built by Marcos - 2025
