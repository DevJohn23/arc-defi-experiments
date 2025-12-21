import { arcProfileABI } from '../abis/arcProfile';

// 1. Endereços dos Contratos (Arc Testnet)
export const ARC_PROFILE_ADDRESS = '0x...'; // TODO: Update with deployed address
export const ARC_DCA_ADDRESS = '0xEbbb3e8630D69ab25Cf55A4B78cf94cE9F3d376A';
export const MOCK_SWAP_ADDRESS = '0xdaB8B474d6BC63A44e410f8174E796130988F7eD';
export const MOCK_WETH_ADDRESS = '0x6FE689cA658F9430cd5F0E31a48AFCE591907298';

// Endereço Oficial do Native Token (USDC) como ERC-20 na Arc (Precompile)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

// Endereço Oficial do EURC na Arc Testnet (Fonte: Docs)
export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

// 2. ABIs dos Contratos
export { arcProfileABI } from '../abis/arcProfile';

// ABI do Contrato ArcDCA (Mantida igual, com 'as const')
export const arcDCAAbi = [
  {
    "type": "function",
    "name": "createPosition",
    "inputs": [
      { "name": "_tokenIn", "type": "address", "internalType": "address" },
      { "name": "_tokenOut", "type": "address", "internalType": "address" },
      { "name": "_amountPerTrade", "type": "uint256", "internalType": "uint256" },
      { "name": "_interval", "type": "uint256", "internalType": "uint256" },
      { "name": "_totalDeposit", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeDCA",
    "inputs": [
      { "name": "_positionId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "positions",
    "inputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "tokenIn", "type": "address", "internalType": "address" },
      { "name": "tokenOut", "type": "address", "internalType": "address" },
      { "name": "amountPerTrade", "type": "uint256", "internalType": "uint256" },
      { "name": "interval", "type": "uint256", "internalType": "uint256" },
      { "name": "lastExecution", "type": "uint256", "internalType": "uint256" },
      { "name": "totalBalance", "type": "uint256", "internalType": "uint256" },
      { "name": "isActive", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextPositionId",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      { "name": "positionId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Executed",
    "inputs": [
      { "name": "positionId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "amountIn", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "amountOut", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const;