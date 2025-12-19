'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, zeroAddress } from 'viem';
import { arcStreamABI } from '@/abis/arcStream';

// Contract Addresses
const ARC_STREAM_ADDRESS = '0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524';
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

interface Stream {
  streamId: bigint;
  recipient: string;
  deposit: bigint;
  tokenAddress: string;
  duration: bigint;
}

export function StreamHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address || !publicClient) return;

    const fetchStreams = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const range = 5000n;
        const fromBlock = currentBlock > range ? currentBlock - range : 0n;

        const logs = await publicClient.getLogs({
          address: ARC_STREAM_ADDRESS,
          event: {
            "anonymous": false,
            "inputs": [
              { "indexed": true, "internalType": "uint256", "name": "streamId", "type": "uint256" },
              { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
              { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
              { "indexed": false, "internalType": "uint256", "name": "deposit", "type": "uint256" },
              { "indexed": false, "internalType": "address", "name": "tokenAddress", "type": "address" },
              { "indexed": false, "internalType": "uint256", "name": "duration", "type": "uint256" }
            ],
            "name": "CreateStream",
            "type": "event"
          },
          args: { sender: address },
          fromBlock: fromBlock,
          toBlock: 'latest',
        });

        const parsedStreams = logs.map((log) => {
          const { streamId, recipient, deposit, tokenAddress, duration } = (log as any).args;
          return { streamId, recipient, deposit, tokenAddress, duration };
        });

        setStreams(parsedStreams.reverse());
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    fetchStreams();
  }, [address, publicClient]);

  // Helper para formatar visualmente os tokens
  const getTokenDisplay = (tokenAddress: string) => {
    if (tokenAddress.toLowerCase() === EURC_ADDRESS.toLowerCase()) {
      return { 
        name: 'EURC', 
        decimals: 6, 
        style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' 
      };
    }
    if (tokenAddress.toLowerCase() === zeroAddress.toLowerCase()) {
      return { 
        name: 'USDC', 
        decimals: 18, // Assumindo nativo como 18 no display, ajuste se necessário
        style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
      };
    }
    return { 
      name: 'UNKNOWN', 
      decimals: 18, 
      style: 'bg-gray-700 text-gray-400 border-gray-600' 
    };
  };

  if (!address) return null;

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 mt-12 overflow-hidden relative shadow-2xl">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-900 via-blue-800 to-indigo-900 opacity-50"></div>

      <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-cyan-500">📜</span> Stream History
        </h2>
        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Recent Activity</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800/50">
          <thead className="bg-black/20">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Recipient</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Token</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 animate-pulse">
                  Searching the blockchain...
                </td>
              </tr>
            ) : streams.length > 0 ? (
              streams.map((stream) => {
                const token = getTokenDisplay(stream.tokenAddress);
                return (
                  <tr key={stream.streamId.toString()} className="group hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                      #{stream.streamId.toString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-cyan-300/80 group-hover:text-cyan-300 transition-colors">
                      {stream.recipient.slice(0, 6)}...{stream.recipient.slice(-4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-white font-medium">
                      {formatUnits(stream.deposit, token.decimals)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${token.style}`}>
                        {token.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400 font-mono">
                      {stream.duration.toString()}s
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                  No streams created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}