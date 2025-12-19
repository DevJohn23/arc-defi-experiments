'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import confetti from 'canvas-confetti';
import { erc20ABI } from '@/abis/erc20';
import { ARC_DCA_ADDRESS, USDC_ADDRESS, EURC_ADDRESS, MOCK_WETH_ADDRESS, arcDCAAbi } from '@/lib/constants';

const TOKEN_DECIMALS = 6; 

export function ArcDCA() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // --- FORM STATES ---
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'EURC'>('USDC');
  const [totalDeposit, setTotalDeposit] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [interval, setInterval] = useState('60'); 
  const [now, setNow] = useState(Date.now());

  // --- UI & LOGIC STATES ---
  const [showToast, setShowToast] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [lastAction, setLastAction] = useState<'approve' | 'create' | 'execute' | null>(null); // NOVO: Para controlar o confete

  const tokenAddress = selectedToken === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;
  const parsedTotalDeposit = totalDeposit ? parseUnits(totalDeposit, TOKEN_DECIMALS) : BigInt(0);

  // 0. RELÓGIO
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 1. DADOS ON-CHAIN
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: tokenAddress as `0x${string}`,
    functionName: 'allowance',
    args: [address!, ARC_DCA_ADDRESS],
    query: { enabled: !!address },
  });

  const { data: nextPositionId, refetch: refetchCount } = useReadContract({
    abi: arcDCAAbi,
    address: ARC_DCA_ADDRESS,
    functionName: 'nextPositionId',
  });

  const count = nextPositionId ? Number(nextPositionId) : 0;
  const ids = Array.from({ length: count }, (_, i) => BigInt(i));
  
  const { data: allPositions, refetch: refetchPositions } = useReadContracts({
    contracts: ids.map(id => ({
      abi: arcDCAAbi as any,
      address: ARC_DCA_ADDRESS as `0x${string}`,
      functionName: 'positions',
      args: [id],
    })),
    query: { enabled: ids.length > 0 }
  });

  const myPositions = allPositions
    ?.map((result, index) => {
      if (result.status !== 'success' || !result.result) return null;
      const data = result.result as any;
      
      const tIn = (data[1] ?? data.tokenIn).toLowerCase();
      const symbol = tIn === USDC_ADDRESS.toLowerCase() ? 'USDC' : (tIn === EURC_ADDRESS.toLowerCase() ? 'EURC' : '???');

      return {
        id: BigInt(index),
        owner: data[0] ?? data.owner,
        tokenIn: data[1] ?? data.tokenIn,
        tokenInSymbol: symbol,
        tokenOut: data[2] ?? data.tokenOut,
        amountPerTrade: data[3] ?? data.amountPerTrade,
        interval: data[4] ?? data.interval,
        lastExecution: data[5] ?? data.lastExecution,
        totalBalance: data[6] ?? data.totalBalance,
        isActive: data[7] ?? data.isActive, 
      };
    })
    .filter((pos) => pos !== null && pos.owner === address);

  // --- TRANSACTION WATCHER ---
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // --- EFEITOS VISUAIS (CORRIGIDO) ---
  useEffect(() => {
    if (isTxSuccess) {
      // SÓ solta confete se NÃO for Approve
      if (lastAction === 'create' || lastAction === 'execute') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: selectedToken === 'EURC' ? ['#fbbf24', '#f59e0b'] : ['#3b82f6', '#a855f7']
        });
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 8000);

      refetchAllowance();
      refetchCount();
      refetchPositions();
      
      // Limpa formulário apenas se criou posição
      if (lastAction === 'create') setTotalDeposit('');
      
      setTxHash(undefined);
      setLastAction(null); // Reseta a ação
    }
  }, [isTxSuccess, lastAction, selectedToken, refetchAllowance, refetchCount, refetchPositions]);

  // --- HANDLERS ---
  const handleApprove = () => {
    setLastAction('approve'); // Marca como Approve
    writeContract({
      abi: erc20ABI,
      address: tokenAddress as `0x${string}`,
      functionName: 'approve',
      args: [ARC_DCA_ADDRESS, parsedTotalDeposit],
      gas: 2000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  const handleCreatePosition = () => {
    if (!totalDeposit || !buyAmount) return;
    setLastAction('create'); // Marca como Create (Confete Sim)
    const parsedBuyAmount = parseUnits(buyAmount, TOKEN_DECIMALS);
    
    writeContract({
      abi: arcDCAAbi,
      address: ARC_DCA_ADDRESS,
      functionName: 'createPosition',
      args: [tokenAddress, MOCK_WETH_ADDRESS, parsedBuyAmount, BigInt(interval), parsedTotalDeposit],
      gas: 2000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  const handleExecute = (posId: bigint) => {
    setLastAction('execute'); // Marca como Execute (Confete Sim)
    writeContract({
      abi: arcDCAAbi,
      address: ARC_DCA_ADDRESS,
      functionName: 'executeDCA',
      args: [posId],
      gas: 3000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  const handleShare = () => {
    const text = `Just auto-swapped ${selectedToken} to WETH on @Arc using ArcDCA! 🚀\n\nTesting the new multi-currency vault feature. #BuildOnArc #DeFi`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };
  
  const needsApproval = allowance !== undefined && allowance < parsedTotalDeposit;
  const isPending = isTxConfirming;

  return (
    <div className="space-y-12 relative pb-10">
      
      {/* TOAST FLUTUANTE */}
      {showToast && (
        <div className="fixed bottom-10 right-10 flex flex-col gap-2 z-50 animate-bounce-in">
          <div className="bg-gray-900/90 backdrop-blur border border-green-500/30 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="bg-green-500/20 rounded-full p-1.5 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <div>
              <h4 className="font-bold text-green-400">Transaction Confirmed</h4>
              <p className="text-xs text-gray-400 font-mono">{lastAction === 'approve' ? 'Spending Approved' : 'Action Successful'}</p>
            </div>
          </div>
          {(lastAction === 'create' || lastAction === 'execute') && (
             <button onClick={handleShare} className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center gap-2 shadow-lg transition-all">
                <span>🐦 Share on X</span>
             </button>
          )}
        </div>
      )}

      {/* PAINEL DE CRIAÇÃO (PREMIUM LOOK) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* CARD DO FORMULÁRIO */}
        <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 relative overflow-hidden">
          {/* Efeito de brilho no topo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
          
          <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Create Vault</h2>
          
          <div className="space-y-5">
            {/* Toggle Switch Personalizado */}
            <div className="flex bg-black/40 p-1.5 rounded-xl border border-gray-700/50">
              {['USDC', 'EURC'].map((token) => (
                <button 
                  key={token}
                  onClick={() => setSelectedToken(token as any)}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${selectedToken === token 
                    ? (token === 'USDC' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/50')
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                >
                  {token === 'USDC' ? '🇺🇸 USDC' : '🇪🇺 EURC'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Deposit</span>
                    <input
                    type="number"
                    className="w-full pl-20 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors text-right font-mono"
                    value={totalDeposit}
                    onChange={(e) => setTotalDeposit(e.target.value)}
                    disabled={isPending}
                    />
                </div>
                <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Trade Size</span>
                    <input
                    type="number"
                    className="w-full pl-24 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors text-right font-mono"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    disabled={isPending}
                    />
                </div>
                 <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Interval (s)</span>
                    <input
                    type="number"
                    className="w-full pl-24 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors text-right font-mono"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    disabled={isPending}
                    />
                </div>
            </div>

            {!address ? (
              <button disabled className="w-full bg-gray-700/50 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed border border-gray-700">
                Connect Wallet
              </button>
            ) : needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isPending || !totalDeposit}
                className={`w-full font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg ${selectedToken === 'USDC' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-blue-900/30' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-yellow-900/30'}`}
              >
                {isPending ? 'Approving...' : `1. Enable ${selectedToken}`}
              </button>
            ) : (
              <button
                onClick={handleCreatePosition}
                disabled={isPending || !totalDeposit}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-900/30"
              >
                {isPending ? 'Processing...' : '2. Launch Vault 🚀'}
              </button>
            )}
          </div>
        </div>

        {/* CARD DE INSTRUÇÕES */}
        <div className="flex flex-col justify-center text-gray-400 space-y-6 p-4">
           <div>
               <h3 className="text-xl font-bold text-white mb-2">Dual-Currency Engine</h3>
               <p className="text-sm leading-relaxed">
                   Our smart contracts now support native routing for both <strong className="text-blue-400">USDC</strong> and <strong className="text-yellow-400">EURC</strong>.
               </p>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/50">
                   <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Strategy</div>
                   <div className="text-white font-semibold">Dollar Cost Average</div>
               </div>
               <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/50">
                   <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Target Asset</div>
                   <div className="text-white font-semibold">Wrapped ETH</div>
               </div>
           </div>

           <div className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl text-sm text-blue-200 flex gap-3 items-start">
             <span className="text-xl">💡</span>
             <p>Use the <strong>Arc Faucet</strong> to get free testnet EURC/USDC. Test the full cycle with our instant execution engine below.</p>
           </div>
        </div>
      </div>

      {/* DASHBOARD AREA */}
      <div className="pt-10">
        <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1 bg-purple-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">Active Positions</h2>
        </div>
        
        {!address ? (
          <p className="text-gray-500 italic">Wallet not connected.</p>
        ) : !myPositions || myPositions.length === 0 ? (
          <div className="p-12 bg-gray-900/30 rounded-2xl text-center border-2 border-gray-800 border-dashed">
            <p className="text-gray-500">Your vaults will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myPositions.map((pos: any) => {
              const lastExec = Number(pos.lastExecution);
              const intervalSec = Number(pos.interval);
              const nextExec = lastExec + intervalSec;
              const currentTime = Math.floor(now / 1000); 
              const isReady = currentTime >= nextExec;
              const timeLeft = nextExec - currentTime;

              const isEur = pos.tokenInSymbol === 'EURC';
              const themeColor = isEur ? 'yellow' : 'blue';
              const gradient = isEur ? 'from-yellow-500/10 to-orange-500/10' : 'from-blue-500/10 to-purple-500/10';
              const borderColor = isEur ? 'border-yellow-500/30' : 'border-blue-500/30';

              return (
                <div key={pos.id} className={`bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border ${borderColor} shadow-xl relative overflow-hidden group hover:border-opacity-100 transition-colors`}>
                  {/* Fundo Gradiente Sutil */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Vault ID</span>
                            <span className="text-xl font-bold text-white">#{pos.id.toString()}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isEur ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                            {pos.tokenInSymbol}
                        </span>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                            <span className="text-gray-400 text-sm">Balance</span>
                            <span className="text-white font-mono text-lg">{formatUnits(pos.totalBalance, TOKEN_DECIMALS)}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                            <span className="text-gray-400 text-sm">Size</span>
                            <span className="text-gray-500 font-mono">{formatUnits(pos.amountPerTrade, TOKEN_DECIMALS)} / trade</span>
                        </div>
                    </div>

                    {pos.totalBalance < pos.amountPerTrade ? (
                        <button disabled className="w-full py-3 bg-gray-800 text-gray-500 rounded-xl font-bold text-sm cursor-not-allowed border border-gray-700">
                        VAULT COMPLETED
                        </button>
                    ) : (
                        <button 
                        onClick={() => handleExecute(pos.id)}
                        disabled={!isReady || isPending}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-lg ${
                            isReady 
                            ? 'bg-green-500 hover:bg-green-400 text-black transform hover:-translate-y-0.5' 
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                        >
                        {isPending ? 'Executing...' : isReady ? '⚡ TRIGGER SWAP' : `Wait ${timeLeft > 0 ? timeLeft : 0}s`}
                        </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}