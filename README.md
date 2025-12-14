# 🏗️ Arc Network Experiments (Layer 1)

**A comprehensive suite of DeFi primitives and dApps exploring the capabilities of the Arc Network Testnet.**

> "Testing the next generation of stablecoin-native blockchains."

🟢 **Live dApp:** [Launch Arc DeFi Suite](https://arc-defi-experiments.vercel.app/)

---

## 👨‍💻 About The Project

I am a final-year technology student and developer diving deep into the **Arc ecosystem**. This repository serves as my engineering log/portfolio as I build production-ready primitives for Arc, specifically exploring:

- **Native USDC as Gas:** Mastering `payable` flows with 18-decimal stablecoins.
- **Hybrid Asset Architecture:** A unified interface supporting both Native USDC and standard ERC-20 tokens (EURC).
- **Onboarding Primitives:** Creating "Invisible Wallet" experiences using link-based payments.
- **Client-Side Privacy:** Implementing off-chain hashing (`keccak256`) to secure secrets before they reach the mempool.

**Tools used:** `Solidity 0.8.30` | `Foundry` | `Next.js` | `RainbowKit` | `Wagmi` | `Viem`

---

## 📂 Projects & Smart Contracts

### 1. 🌊 ArcStream v2.1 (Flagship)
*File: `src/ArcStream.sol` | UI: `src/app/page.tsx`*

A **Multi-Asset Payment Streaming Protocol** allowing real-time salary/vesting distribution.
- **Features:** "Smart Form" UX that automatically toggles between **Approve** (ERC-20) and **Create** (Native) flows based on asset selection.
- **Logic:** Continuous liquidity calculation allowing second-by-second withdrawals.
- **Status:** Live & Stable.

### 2. 🔗 ArcLink (New Feature)
*File: `src/ArcLink.sol` | UI: `Tabs/ArcLink`*

A **"Cash App" style Payment Link system**.
- **Problem Solved:** Allows sending crypto to users via WhatsApp/Discord before they even connect a wallet.
- **Tech Stack:**
    - **Dual-Mode Contract:** Handles `msg.value` for Native USDC (18 decimals) and `transferFrom` for ERC-20s (6 decimals) in a single component.
    - **Zero-Knowledge Secrets:** The password is hashed on the client-side (`viem`). The contract only verifies the hash, ensuring the plain-text key is never exposed on-chain.
- **UX:** Persistent link generation and auto-cleaning states for seamless transfers.

### 3. 🏦 ArcTimeLock (Advanced)
*File: `src/ArcTimeLock.sol`*
A **Profit Locker Vault** for disciplined trading.
- **Logic:** Struct-based position management with `block.timestamp` constraints.
- **Security:** Checks-Effects-Interactions pattern to prevent reentrancy.

### 4. 🛡️ ArcVault (Intermediate)
*File: `src/ArcVault.sol`*
A transparent banking contract to test deposit/withdrawal flows and network latency.

---

## 🚀 Deployment & Verified Contracts

All contracts are deployed and verified on the **Arc Testnet**.

| Contract | Feature | Explorer Link |
|----------|---------|---------------|
| **ArcStream v2.1** | Streaming / Payroll | [View Contract](https://testnet.arcscan.app/address/0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524) |
| **ArcLink** | **Payment Links / Privacy** | [View Contract](https://testnet.arcscan.app/address/0x74D27f868FA5253D89e9C65527aD3397860bEE8e) |
| **ArcTimeLock** | Time-Logic / Structs | [View Contract](https://testnet.arcscan.app/address/0x2eCEeE24607F380FE5e704A3b642C574FDe1245B) |
| **ArcVault** | Payable / Mappings | [View Contract](https://testnet.arcscan.app/address/0xc57f8ac1da34a8367c8005fEdDb47cE3D41cf456) |

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
   forge script script/ArcLink.s.sol --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast
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

With the core payment primitives (Streaming & Links) complete, my next focus is on Automated Trading Tools and Order Book logic within the Arc ecosystem.

---

Built by Marcos - 2025
