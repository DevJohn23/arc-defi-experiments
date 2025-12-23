// File: src/abis/arcLink.ts

export const arcLinkABI = [
  {
    "type": "function",
    "name": "createLink",
    "inputs": [
      { "name": "_secretHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "_token", "type": "address", "internalType": "address" },
      { "name": "_amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "claimLink",
    "inputs": [
      { "name": "_secret", "type": "string", "internalType": "string" },
      { "name": "_recipient", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "LinkCreated",
    "inputs": [
      { "name": "creator", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "secretHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "token", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LinkClaimed",
    "inputs": [
      { "name": "claimer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "secretHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" }
    ],
    "anonymous": false
  }
] as const;