'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseUnits, formatUnits, zeroAddress } from 'viem';
import { arcStreamABI } from '@/abis/arcStream';
import { erc20ABI } from '@/abis/erc20';
import { StreamHistory } from '@/components/StreamHistory';
import { ArcLink } from '@/components/ArcLink';
import { ArcDCA } from '@/components/ArcDCA';
import { Footer } from '@/components/footer';


// Contract Addresses
const ARC_STREAM_ADDRESS = '0xB6E49f0213c47C6f42F4f9792E7aAf6a604FD524';
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

type TokenSymbol = 'NATIVE' | 'EURC';
type ActiveTab = 'stream' | 'link' | 'dca';

export default function Home() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Component State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dca'); // Começar no DCA (destaque da atualização)
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

  // Read EURC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: EURC_ADDRESS,
    functionName: 'allowance',
    args: [address!, ARC_STREAM_ADDRESS],
    query: { enabled: !!address && !isNativeToken },
  });

  // Watchers
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = 
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isStreamPending, isSuccess: isStreamSuccess } = 
    useWaitForTransactionReceipt({ hash: createStreamHash });

  // Effects
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);
  
  useEffect(() => {
    if (isStreamSuccess) {
      setAmount('');
      setRecipient('');
      setDuration('');
      setTimeout(() => {
        if (!isNativeToken) refetchAllowance(); 
      }, 1000);
    }
  }, [isStreamSuccess, isNativeToken, refetchAllowance]);

  useEffect(() => {
    if (streamId) {
      const interval = setInterval(() => refetchClaimable(), 5000);
      return () => clearInterval(interval);
    }
  }, [streamId, refetchClaimable]);

  // Handlers
  const handleApprove = () => {
    writeContract({
      abi: erc20ABI,
      address: EURC_ADDRESS,
      functionName: 'approve',
      args: [ARC_STREAM_ADDRESS, parseUnits(amount, 6)],
    }, { onSuccess: (hash) => setApproveHash(hash) });
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
      args: [recipient as `0x${string}`, parsedAmount, BigInt(duration), tokenAddress],
      value: isNativeToken ? parsedAmount : BigInt(0),
    }, { onSuccess: (hash) => setCreateStreamHash(hash) });
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
    <main className="min-h-screen bg-black text-white relative overflow-x-hidden flex flex-col font-sans">
      
      {/* 1. Background Global "Nebulosa" */}
      <div className="fixed inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10"></div>
      
      {/* 2. Top Bar (Logo + Connect) */}
      <header className="w-full max-w-7xl mx-auto p-6 flex justify-between items-center z-10 relative">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/20"></div>
            <span className="font-bold text-xl tracking-tight text-white">ArcProtocol</span>
         </div>
         <ConnectButton />
      </header>

      <div className="flex-grow container mx-auto px-4 py-8">
        
        {/* 3. Título Hero */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight">
            Arc DeFi Suite
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            The all-in-one toolkit. Stream money, create payment links, and automate your investments.
          </p>
        </div>

        {/* 4. Menu de Navegação "Glass Pill" */}
        <div className="flex justify-center mb-16">
          <div className="bg-gray-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-gray-700/50 inline-flex gap-2 shadow-2xl">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                activeTab === 'stream' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              🌊 ArcStream
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                activeTab === 'link' 
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-900/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              🔗 ArcLink
            </button>
            <button
              onClick={() => setActiveTab('dca')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                activeTab === 'dca' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              🤖 Auto-Trade
            </button>
          </div>
        </div>

        {/* 5. Renderização das Abas */}
        <div className="max-w-5xl mx-auto transition-all duration-500 min-h-[500px]">
          
          {/* --- ABA STREAM (Remodelada com Estilo Glass) --- */}
          {activeTab === 'stream' && (
            <div className="animate-in fade-in zoom-in duration-300">
               {/* Título da Seção */}
              <div className="flex items-center gap-3 mb-8">
                 <div className="h-8 w-1 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                 <h2 className="text-2xl font-bold text-white">Money Streaming</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                
                {/* CARD DE CRIAÇÃO (Esquerda) */}
                <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-70"></div>
                  
                  <h2 className="text-xl font-bold mb-6 text-white">Start New Stream</h2>
                  
                  {/* Token Selector Pill */}
                  <div className="flex bg-black/40 p-1 rounded-xl border border-gray-700/50 mb-6">
                    <button 
                      onClick={() => setSelectedToken('NATIVE')}
                      disabled={isPending}
                      className={`w-1/2 py-2 rounded-lg font-bold text-sm transition-all ${selectedToken === 'NATIVE' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      USDC (Native)
                    </button>
                    <button 
                      onClick={() => setSelectedToken('EURC')}
                      disabled={isPending}
                      className={`w-1/2 py-2 rounded-lg font-bold text-sm transition-all ${selectedToken === 'EURC' ? 'bg-yellow-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      EURC
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-500 text-sm">To</span>
                        <input
                          type="text"
                          placeholder="0x..."
                          className="w-full pl-12 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          disabled={isPending}
                        />
                    </div>
                    
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Amount</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full pl-20 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors text-right font-mono"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          disabled={isPending}
                        />
                    </div>

                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Duration</span>
                        <input
                          type="number"
                          placeholder="Seconds"
                          className="w-full pl-20 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors text-right font-mono"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          disabled={isPending}
                        />
                    </div>

                    {address ? (
                      needsApproval ? (
                        <button
                          onClick={handleApprove}
                          disabled={isPending || !amount}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-yellow-900/20"
                        >
                          {isApprovePending ? 'Approving...' : `1. Approve ${amount} EURC`}
                        </button>
                      ) : (
                        <button
                          onClick={handleCreateStream}
                          disabled={isPending || !amount || !recipient || !duration}
                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-cyan-900/30"
                        >
                          {isStreamPending ? 'Creating Stream...' : '2. Start Stream 🌊'}
                        </button>
                      )
                    ) : (
                      <button disabled className="w-full bg-gray-700 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed border border-gray-600">
                        Connect Wallet
                      </button>
                    )}
                  </div>
                </div>

                {/* CARD DE WITHDRAW (Direita) */}
                <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 relative">
                  <h2 className="text-xl font-bold mb-6 text-white">Check & Withdraw</h2>
                  <div className="space-y-6">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Stream ID</label>
                        <input
                            type="number"
                            placeholder="e.g. 1"
                            className="w-full p-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                            value={streamId}
                            onChange={(e) => setStreamId(e.target.value)}
                        />
                    </div>
                    
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/30 text-center">
                      <p className="text-gray-400 text-sm mb-1">Claimable Balance</p>
                      <p className="text-3xl font-bold text-white font-mono tracking-tight">
                        {claimableBalance !== undefined ? `${formatUnits(claimableBalance, decimals)}` : '0.00'}
                      </p>
                      <p className="text-xs text-cyan-400 mt-1">{isNativeToken ? 'USDC' : 'EURC'}</p>
                    </div>

                    <button
                      onClick={handleWithdraw}
                      disabled={!address || !streamId}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition duration-300 border border-gray-600 hover:border-gray-500"
                    >
                      {address ? 'Withdraw Funds' : 'Connect Wallet'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Histórico Abaixo */}
              <StreamHistory />
            </div>
          )}
          
          {/* --- OUTRAS ABAS --- */}
          {activeTab === 'link' && (
             <div className="animate-in fade-in zoom-in duration-300">
                <ArcLink />
             </div>
          )}

          {activeTab === 'dca' && (
             <div className="animate-in fade-in zoom-in duration-300">
                <ArcDCA />
             </div>
          )}

        </div>
      </div>
      
      <Footer/>
    </main>
  );
}