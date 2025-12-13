'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseEther, formatEther, zeroAddress } from 'viem';
import { arcStreamABI } from '@/abis/arcStream';
import { erc20ABI } from '@/abis/erc20';

// Contract Addresses
const ARC_STREAM_ADDRESS = '0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524';
const MOCK_EURC_ADDRESS = '0xFd2688cE369A543a6D4Ed6adE4350ebD13F88AC4';

type TokenSymbol = 'NATIVE' | 'EURC';

export default function Home() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Component State
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('NATIVE');
  
  // Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [streamId, setStreamId] = useState('');
  
  // Transaction Hashes
  const [approveHash, setApproveHash] = useState<`0x${string}`>();
  const [createStreamHash, setCreateStreamHash] = useState<`0x${string}`>();

  const parsedAmount = amount ? parseEther(amount) : BigInt(0);

  // Read claimable balance from stream
  const { data: claimableBalance, refetch: refetchClaimable } = useReadContract({
    abi: arcStreamABI,
    address: ARC_STREAM_ADDRESS,
    functionName: 'balanceOf',
    args: [BigInt(streamId || 0)],
    query: { enabled: !!streamId },
  });

  // Read MockEURC allowance for the ArcStream contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: MOCK_EURC_ADDRESS,
    functionName: 'allowance',
    args: [address!, ARC_STREAM_ADDRESS],
    query: { enabled: !!address && selectedToken === 'EURC' },
  });

  // Watcher for the approve transaction
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = 
    useWaitForTransactionReceipt({ 
      hash: approveHash, 
    });

  // Watcher for the create stream transaction
  const { isLoading: isStreamPending, isSuccess: isStreamSuccess } = 
    useWaitForTransactionReceipt({ 
      hash: createStreamHash, 
    });

  // Effect to refetch allowance after a successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      console.log('✅ Approval successful! Refetching allowance...');
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);
  
  // The Cleanup Effect for creating a stream
  useEffect(() => {
    if (isStreamSuccess) {
      console.log("✅ Stream Created! Cleaning up UI...");
      setAmount('');
      setRecipient('');
      setDuration('');
      
      // Small delay to let the blockchain settle before refetching allowance
      setTimeout(() => {
        refetchAllowance(); 
        console.log("🔄 Allowance refetched");
      }, 1000);
    }
  }, [isStreamSuccess, refetchAllowance]);

  // Effect to refetch claimable balance periodically
  useEffect(() => {
    if (streamId) {
      const interval = setInterval(() => refetchClaimable(), 5000);
      return () => clearInterval(interval);
    }
  }, [streamId, refetchClaimable]);

  const handleApprove = () => {
    writeContract({
      abi: erc20ABI,
      address: MOCK_EURC_ADDRESS,
      functionName: 'approve',
      args: [ARC_STREAM_ADDRESS, parsedAmount],
    },
    {
      onSuccess: (hash) => setApproveHash(hash),
    });
  };

  const handleCreateStream = () => {
    if (!recipient || !amount || !duration) {
      alert('Please fill all fields');
      return;
    }

    const isNative = selectedToken === 'NATIVE';
    const tokenAddress = isNative ? zeroAddress : MOCK_EURC_ADDRESS;
    
    writeContract({
      abi: arcStreamABI,
      address: ARC_STREAM_ADDRESS,
      functionName: 'createStream',
      args: [
        recipient as `0x${string}`,
        parsedAmount, 
        BigInt(duration),
        tokenAddress
      ],
      value: isNative ? parsedAmount : BigInt(0),
    },
    {
      onSuccess: (hash) => setCreateStreamHash(hash),
    });
  };

  const handleWithdraw = () => {
    if (!streamId) {
      alert('Please enter a Stream ID');
      return;
    }
    writeContract({
      abi: arcStreamABI,
      address: ARC_STREAM_ADDRESS,
      functionName: 'withdrawFromStream',
      args: [BigInt(streamId)],
    });
  };

  const needsApproval = selectedToken === 'EURC' && allowance !== undefined && allowance < parsedAmount;
  const isPending = isApprovePending || isStreamPending;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <header className="w-full max-w-5xl flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-purple-400">ArcStream v2.1</h1>
        <ConnectButton />
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Create a New Stream</h2>
          
          <div className="flex bg-gray-700 rounded-lg p-1 mb-4">
            <button 
              onClick={() => setSelectedToken('NATIVE')}
              disabled={isPending}
              className={`w-1/2 p-2 rounded-md font-semibold transition-colors ${selectedToken === 'NATIVE' ? 'bg-purple-600' : 'bg-transparent hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Native USDC
            </button>
            <button 
              onClick={() => setSelectedToken('EURC')}
              disabled={isPending}
              className={`w-1/2 p-2 rounded-md font-semibold transition-colors ${selectedToken === 'EURC' ? 'bg-purple-600' : 'bg-transparent hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Mock EURC
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Recipient Address (0x...)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isPending}
            />
            <input
              type="number"
              placeholder={`Amount (in ${selectedToken === 'NATIVE' ? 'USDC' : 'EURC'})`}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
            />
            <input
              type="number"
              placeholder="Duration (in seconds)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isPending}
            />

            {address ? (
              needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={isPending || !amount}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isApprovePending ? 'Approving...' : `Approve ${amount} EURC`}
                </button>
              ) : (
                <button
                  onClick={handleCreateStream}
                  disabled={isPending || !amount || !recipient || !duration}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isStreamPending ? 'Confirming...' : 'Start Stream'}
                </button>
              )
            ) : (
              <button
                disabled={true}
                className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded cursor-not-allowed"
              >
                Connect Wallet to Start
              </button>
            )}
          </div>
        </div>

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
                {claimableBalance !== undefined ? `${formatEther(claimableBalance)}` : '0.0'}
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
        <p>ArcStream Frontend v0.2.1</p>
      </footer>
    </div>
  );
}