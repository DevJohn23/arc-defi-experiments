'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseUnits, formatUnits, zeroAddress } from 'viem';
import { arcStreamABI } from '@/abis/arcStream';
import { erc20ABI } from '@/abis/erc20';
import { StreamHistory } from '@/components/StreamHistory';
import { ArcLink } from '@/components/ArcLink';
import { ArcDCA } from '@/components/ArcDCA'; // 1. Import ArcDCA
import { Footer } from '@/components/footer';


// Contract Addresses
const ARC_STREAM_ADDRESS = '0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524';
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

type TokenSymbol = 'NATIVE' | 'EURC';
type ActiveTab = 'stream' | 'link' | 'dca'; // 2. Add 'dca' to ActiveTab type

export default function Home() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Component State
  const [activeTab, setActiveTab] = useState<ActiveTab>('stream');
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('NATIVE');
  
  // Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [streamId, setStreamId] = useState('');
  
  // Transaction Hashes
  const [approveHash, setApproveHash] = useState<`0x${string}`>();
  const [createStreamHash, setCreateStreamHash] = useState<`0x${string}`>();

  const isNativeToken = selectedToken === 'NATIVE';
  const decimals = isNativeToken ? 18 : 6;
  const parsedAmount = amount ? parseUnits(amount, decimals) : BigInt(0);

  // Read claimable balance from stream
  const { data: claimableBalance, refetch: refetchClaimable } = useReadContract({
    abi: arcStreamABI,
    address: ARC_STREAM_ADDRESS,
    functionName: 'balanceOf',
    args: [BigInt(streamId || 0)],
    query: { enabled: !!streamId },
  });

  // Read EURC allowance for the ArcStream contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: EURC_ADDRESS,
    functionName: 'allowance',
    args: [address!, ARC_STREAM_ADDRESS],
    query: { enabled: !!address && !isNativeToken },
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
        if (!isNativeToken) {
          refetchAllowance(); 
          console.log("🔄 Allowance refetched");
        }
      }, 1000);
    }
  }, [isStreamSuccess, isNativeToken, refetchAllowance]);

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
      address: EURC_ADDRESS,
      functionName: 'approve',
      args: [ARC_STREAM_ADDRESS, parseUnits(amount, 6)],
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

    const tokenAddress = isNativeToken ? zeroAddress : EURC_ADDRESS;
    
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
      value: isNativeToken ? parsedAmount : BigInt(0),
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

  const needsApproval = !isNativeToken && allowance !== undefined && allowance < parsedAmount;
  const isPending = isApprovePending || isStreamPending;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      <header className="w-full max-w-5xl flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-purple-400">ArcProtocol</h1>
        <ConnectButton />
      </header>

      <main className="w-full max-w-5xl">
        {/* 3. Tab Navigation Update */}
        <div className="flex justify-center border-b border-gray-700 mb-8">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-6 py-3 font-semibold ${activeTab === 'stream' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            ArcStream
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`px-6 py-3 font-semibold ${activeTab === 'link' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            ArcLink
          </button>
          <button
            onClick={() => setActiveTab('dca')}
            className={`px-6 py-3 font-semibold ${activeTab === 'dca' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            🤖 Auto-Trade
          </button>
        </div>

        {/* 4. Conditional Rendering Update */}
        {activeTab === 'stream' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    EURC
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
                    placeholder={`Amount (in ${isNativeToken ? 'USDC' : 'EURC'})`}
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
                      {claimableBalance !== undefined ? `${formatUnits(claimableBalance, decimals)}` : '0.0'}
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
            </div>
            <StreamHistory />
          </div>
        )}
        
        {activeTab === 'link' && <ArcLink />}

        {activeTab === 'dca' && <ArcDCA />}

      </main>
      <Footer/>
    </div>

  );
}