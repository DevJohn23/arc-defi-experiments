'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { arcStreamABI } from '@/abis/arcStream';

const contractAddress = '0xaDB37Ac14b8714b449Be5eaE6cb59D2Fb4bBe0b1';

export default function Home() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [streamId, setStreamId] = useState('');
  
// Read contract state
  const { data: claimableBalance, refetch } = useReadContract({
    abi: arcStreamABI,
    address: contractAddress,
    functionName: 'balanceOf',
    args: [BigInt(streamId || 0)], // CORREÇÃO: Apenas 1 argumento
    query: {
      enabled: !!streamId, // Só precisa do ID para buscar
    }
  });

  useEffect(() => {
    if (streamId) {
      const interval = setInterval(() => {
        refetch();
      }, 5000); // Refetch every 5 seconds
      return () => clearInterval(interval);
    }
  }, [streamId, refetch]);

  const handleCreateStream = async () => {
    if (!recipient || !amount || !duration) {
      alert('Please fill all fields');
      return;
    }
    writeContract({
      abi: arcStreamABI,
      address: contractAddress,
      functionName: 'createStream',
      args: [recipient as `0x${string}`, BigInt(duration)],
      value: parseEther(amount),
    });
  };

  const handleWithdraw = () => {
    if (!streamId) {
      alert('Please enter a Stream ID');
      return;
    }
    writeContract({
      abi: arcStreamABI,
      address: contractAddress,
      functionName: 'withdrawFromStream',
      args: [BigInt(streamId)],
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <header className="w-full max-w-5xl flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-purple-400">ArcStream</h1>
        <ConnectButton />
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Stream Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Create a New Stream</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Recipient Address (0x...)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="number"
              placeholder="Amount (in USDC)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (in seconds)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <button
              onClick={handleCreateStream}
              disabled={!address}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {address ? 'Start Stream' : 'Connect Wallet to Start'}
            </button>
          </div>
        </div>

        {/* My Streams Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Check & Withdraw from Stream</h2>
          <div className="space-y-4">
            <input
              type="number"
              placeholder="Enter Stream ID"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
            />
            <div className="bg-gray-700 p-4 rounded">
              <p className="text-gray-400">Claimable Balance:</p>
              <p className="text-2xl font-mono">
                {claimableBalance !== undefined ? `${formatEther(claimableBalance)} USDC` : '0.000000 USDC'}
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={!address || !streamId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {address ? 'Withdraw Funds' : 'Connect Wallet to Withdraw'}
            </button>
          </div>
        </div>
      </main>
      <footer className="w-full max-w-5xl mt-12 text-center text-gray-500">
        <p>ArcStream Frontend v0.1.0</p>
      </footer>
    </div>
  );
}