# 🏗️ Arc DeFi Suite (v2.5)

**A professional-grade suite of DeFi primitives and dApps exploring the capabilities of the Arc Network Testnet.**

> "Testing the next generation of stablecoin-native blockchains with premium UX."

🟢 **Live dApp:** [Launch Arc DeFi Suite](https://arc-defi-experiments.vercel.app/)

---

## 👨‍💻 About The Project

I am a final-year technology student and developer diving deep into the **Arc ecosystem**. This repository serves as my engineering log/portfolio as I build production-ready primitives for Arc.

**The v2.5 Update (Gamification Layer):**
This release introduces the **Arc Passport**, an on-chain reputation system. The project now features full **Contract Composability**, where the payment and trading contracts automatically interact with the Profile contract to award XP and Badges in real-time.

**Key Explorations:**
- **Smart Contract Composability:** Contracts (`Stream`, `Link`, `DCA`) autonomously calling external contracts to update user state (XP/Badges).
- **Soulbound NFTs (SBT):** Implementing non-transferable identity tokens for on-chain reputation.
- **Native USDC as Gas:** Mastering `payable` flows with 18-decimal stablecoins.
- **Hybrid Asset Architecture:** A unified interface supporting both Native USDC and standard ERC-20 tokens (EURC).
- **Client-Side Privacy:** Implementing off-chain hashing (`keccak256`) to secure secrets before they reach the mempool.

**Tools used:** `Solidity 0.8.30` | `Foundry` | `Next.js` | `RainbowKit` | `Wagmi` | `Viem` | `Canvas Confetti`

---

## 🆔 Arc Passport (New Gamification Layer)
*File: `src/ArcProfile.sol` | UI: `Tabs/Profile`*

A **Soulbound (Non-Transferable) NFT** that tracks a user's journey within the ecosystem.
- **On-Chain Reputation:** Stores XP, Level, and Badges directly on the blockchain.
- **Automated Rewards:**
    - 🔗 **Linker Badge:** Unlocks when creating a Payment Link.
    - 💸 **Streamer Badge:** Unlocks when starting a Money Stream.
    - 🤖 **Investor Badge:** Unlocks when creating a DCA Vault.

---

## 📂 DeFi Primitives

### 1. 🤖 ArcDCA
*File: `src/ArcDCA.sol` | UI: `Tabs/Auto-Trade`*

A **Dollar Cost Averaging (DCA) Vault** with an interactive dashboard.
- **Mock Integration:** Solves testnet liquidity issues by routing trades through a custom **MockSwap** contract (USDC/EURC -> WETH).
- **Dual-Currency Engine:** Users can seamlessly create vaults using **Native USDC** or **EURC**.
- **Gamified:** Automatically awards **+100 XP** and the "Investor" Badge upon vault creation.

### 2. 🌊 ArcStream v2.1
*File: `src/ArcStream.sol` | UI: `Tabs/ArcStream`*

A **Multi-Asset Payment Streaming Protocol** allowing real-time salary/vesting distribution.
- **Features:** "Smart Form" UX that automatically toggles between **Approve** (ERC-20) and **Create** (Native) flows based on asset selection.
- **Logic:** Continuous liquidity calculation allowing second-by-second withdrawals.
- **Gamified:** Awards **+50 XP** and the "Streamer" Badge.

### 3. 🔗 ArcLink
*File: `src/ArcLink.sol` | UI: `Tabs/ArcLink`*

A **"Cash App" style Payment Link system**.
- **Problem Solved:** Allows sending crypto to users via WhatsApp/Discord before they even connect a wallet.
- **Tech Stack:**
    - **Dual-Mode Contract:** Handles `msg.value` for Native USDC and `transferFrom` for EURC in a single component.
    - **Zero-Knowledge Secrets:** The password is hashed on the client-side. The contract only verifies the hash, ensuring the plain-text key is never exposed on-chain.
- **Gamified:** Awards **+20 XP** and the "Linker" Badge.

---

## 🚀 Deployment & Verified Contracts

All contracts are deployed and verified on the **Arc Testnet**.

| Contract | Feature | Explorer Link |
|----------|---------|---------------|
| **ArcProfile** | **On-Chain Identity (SBT)** | [View Contract](https://testnet.arcscan.app/address/0x375722a9D6D6295532C9c3213B6b73C2c14E6f2E) |
| **ArcDCA** | Auto-Invest / MockSwap | [View Contract](https://testnet.arcscan.app/address/0x599A2327AA5D933F8f3Eb425AdB7F2E66e50690C) |
| **ArcStream** | Streaming / Payroll | [View Contract](https://testnet.arcscan.app/address/0x51Fa95e5c024eBC595e44cF7573A4414f0bdA356) |
| **ArcLink** | Payment Links | [View Contract](https://testnet.arcscan.app/address/0x58318146945D90925928326146f60f023EaAF32b) |

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

With the core payment primitives and the reputation layer complete, my next focus is on Privacy Layers (ZK) and exploring Order Book logic within the Arc ecosystem.
---

Built by Marcos - 2025
