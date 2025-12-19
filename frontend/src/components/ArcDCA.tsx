'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import confetti from 'canvas-confetti';
import { erc20ABI } from '@/abis/erc20';
import { ARC_DCA_ADDRESS, USDC_ADDRESS, EURC_ADDRESS, MOCK_WETH_ADDRESS, arcDCAAbi } from '@/lib/constants';

// Na Arc, tanto USDC quanto EURC usam 6 decimais.
const TOKEN_DECIMALS = 6; 

export function ArcDCA() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // --- FORM STATES ---
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'EURC'>('USDC'); // NOVO: Seletor de Moeda
  const [totalDeposit, setTotalDeposit] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [interval, setInterval] = useState('60'); 
  const [now, setNow] = useState(Date.now());

  // --- UI FEEDBACK STATES ---
  const [showToast, setShowToast] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [lastExecutedId, setLastExecutedId] = useState<string | null>(null); // Para o botão de share

  // Lógica Dinâmica de Endereço
  const tokenAddress = selectedToken === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;
  const parsedTotalDeposit = totalDeposit ? parseUnits(totalDeposit, TOKEN_DECIMALS) : BigInt(0);

  // 0. RELÓGIO (HEARTBEAT)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 1. LEITURA DE DADOS (Dinâmico base no tokenAddress)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: tokenAddress as `0x${string}`, // Lê allowance do token escolhido
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
      
      // Identificar qual token é para exibir o símbolo certo no card
      const tIn = (data[1] ?? data.tokenIn).toLowerCase();
      const symbol = tIn === USDC_ADDRESS.toLowerCase() ? 'USDC' : (tIn === EURC_ADDRESS.toLowerCase() ? 'EURC' : '???');

      return {
        id: BigInt(index),
        owner: data[0] ?? data.owner,
        tokenIn: data[1] ?? data.tokenIn,
        tokenInSymbol: symbol, // NOVO: Guardamos o símbolo para exibir
        tokenOut: data[2] ?? data.tokenOut,
        amountPerTrade: data[3] ?? data.amountPerTrade,
        interval: data[4] ?? data.interval,
        lastExecution: data[5] ?? data.lastExecution,
        totalBalance: data[6] ?? data.totalBalance,
        isActive: data[7] ?? data.isActive, 
      };
    })
    .filter((pos) => pos !== null && pos.owner === address);

  // --- WATCHER DE TRANSAÇÃO ---
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // EFEITO DE SUCESSO
  useEffect(() => {
    if (isTxSuccess) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#3b82f6', '#fbbf24'] // Roxo, Azul, Amarelo (EUR)
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 8000); // 8s para dar tempo de clicar no share

      refetchAllowance();
      refetchCount();
      refetchPositions();
      setTotalDeposit('');
      setTxHash(undefined);
    }
  }, [isTxSuccess, refetchAllowance, refetchCount, refetchPositions]);

  // --- ACTIONS ---
  const handleApprove = () => {
    writeContract({
      abi: erc20ABI,
      address: tokenAddress as `0x${string}`, // Aprova o token selecionado
      functionName: 'approve',
      args: [ARC_DCA_ADDRESS, parsedTotalDeposit],
      gas: 2000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  const handleCreatePosition = () => {
    if (!totalDeposit || !buyAmount) return;
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
    setLastExecutedId(posId.toString()); // Salva o ID para o share
    writeContract({
      abi: arcDCAAbi,
      address: ARC_DCA_ADDRESS,
      functionName: 'executeDCA',
      args: [posId],
      gas: 3000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  // Função para abrir o Twitter/X
  const handleShare = () => {
    const text = `Just auto-swapped ${selectedToken} to WETH on @Arc using ArcDCA! 🚀\n\nTesting the new multi-currency vault feature. #BuildOnArc #DeFi`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };
  
  const needsApproval = allowance !== undefined && allowance < parsedTotalDeposit;
  const isPending = isTxConfirming;

  return (
    <div className="space-y-12 relative">
      {/* TOAST DE SUCESSO + SHARE BUTTON */}
      {showToast && (
        <div className="fixed bottom-10 right-10 flex flex-col gap-2 z-50 animate-bounce-in">
          <div className="bg-gray-800 border border-green-500/50 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1">
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <div>
              <h4 className="font-bold text-green-400">Success!</h4>
              <p className="text-sm text-gray-400">Transaction Confirmed on Arc.</p>
            </div>
          </div>
          <button 
            onClick={handleShare}
            className="bg-black text-white px-6 py-3 rounded-lg font-bold border border-gray-700 hover:bg-gray-900 flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <span>🐦 Share on X</span>
          </button>
        </div>
      )}

      {/* SEÇÃO 1: CRIAR NOVO ROBÔ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-white">Create Auto-Trade Vault</h2>
          <div className="space-y-4">
            
            {/* NOVO: SELETOR DE MOEDA */}
            <div className="flex gap-4 p-1 bg-gray-700 rounded-lg">
              <button 
                onClick={() => setSelectedToken('USDC')}
                className={`flex-1 py-2 rounded-md font-bold transition-all ${selectedToken === 'USDC' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                🇺🇸 USDC
              </button>
              <button 
                onClick={() => setSelectedToken('EURC')}
                className={`flex-1 py-2 rounded-md font-bold transition-all ${selectedToken === 'EURC' ? 'bg-yellow-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                🇪🇺 EURC
              </button>
            </div>

            <input
              type="number"
              placeholder={`Total Deposit (${selectedToken})`}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-purple-500"
              value={totalDeposit}
              onChange={(e) => setTotalDeposit(e.target.value)}
              disabled={isPending}
            />
            <input
              type="number"
              placeholder={`Buy Amount (${selectedToken})`}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-purple-500"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              disabled={isPending}
            />
            <input
              type="number"
              placeholder="Interval (seconds)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-purple-500"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              disabled={isPending}
            />

            {!address ? (
              <button disabled className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded cursor-not-allowed">
                Connect Wallet first
              </button>
            ) : needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isPending || !totalDeposit}
                className={`w-full font-bold py-3 px-4 rounded transition disabled:opacity-50 ${selectedToken === 'USDC' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}`}
              >
                {isPending ? 'Approving...' : `1. Approve ${totalDeposit} ${selectedToken}`}
              </button>
            ) : (
              <button
                onClick={handleCreatePosition}
                disabled={isPending || !totalDeposit}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition disabled:opacity-50"
              >
                {isPending ? 'Processing...' : '2. Activate Bot 🚀'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center">
           <h3 className="text-xl font-semibold mb-4 text-white">Multi-Currency Support</h3>
           <ol className="list-decimal list-inside text-gray-400 space-y-3">
              <li>Select <strong>USDC</strong> or <strong>EURC</strong>.</li>
              <li>Approve the specific token contract.</li>
              <li>Deposit into the vault.</li>
              <li>Trades will swap your selected currency for WETH.</li>
           </ol>
           <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded text-sm text-blue-200">
             💡 Pro Tip: Use the Easy Faucet to get 50 EURC daily to test this feature!
           </div>
        </div>
      </div>

      {/* SEÇÃO 2: DASHBOARD */}
      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-6">📉 My Active Positions</h2>
        
        {!address ? (
          <p className="text-gray-400">Connect wallet to view positions.</p>
        ) : !myPositions || myPositions.length === 0 ? (
          <div className="p-8 bg-gray-800/50 rounded-lg text-center border border-gray-700 border-dashed">
            <p className="text-gray-400">No active bots found. Create one above!</p>
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

              // Cor do card baseada na moeda (Visualização melhor)
              const isEur = pos.tokenInSymbol === 'EURC';
              const badgeColor = isEur ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400';
              const borderClass = isEur ? 'border-yellow-600/30' : 'border-blue-600/30';

              return (
                <div key={pos.id} className={`bg-slate-800 rounded-xl p-5 border ${borderClass} shadow-xl relative overflow-hidden group`}>
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isEur ? 'from-yellow-500 to-orange-500' : 'from-blue-500 to-purple-500'}`}></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-white text-lg">Vault #{pos.id.toString()}</h3>
                    <div className="flex gap-2">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{pos.tokenInSymbol}</span>
                       <span className={`px-2 py-1 rounded text-xs font-bold ${pos.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pos.isActive ? 'ON' : 'OFF'}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300 mb-6">
                    <div className="flex justify-between">
                      <span>Vault Balance:</span>
                      <span className="text-white font-mono">{formatUnits(pos.totalBalance, TOKEN_DECIMALS)} {pos.tokenInSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trade Size:</span>
                      <span className="text-white font-mono">{formatUnits(pos.amountPerTrade, TOKEN_DECIMALS)} {pos.tokenInSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interval:</span>
                      <span className="text-white">{pos.interval.toString()}s</span>
                    </div>
                  </div>

                  {pos.totalBalance < pos.amountPerTrade ? (
                    <button disabled className="w-full py-2 bg-gray-700 text-gray-500 rounded font-bold cursor-not-allowed">
                      Empty Vault (Finished)
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleExecute(pos.id)}
                      disabled={!isReady || isPending}
                      className={`w-full py-3 rounded font-bold transition-all flex justify-center items-center gap-2 ${
                        isReady 
                          ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-500/25 scale-100 hover:scale-[1.02]' 
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isPending ? 'Executing...' : isReady ? '⚡ Force Run Trade' : `Wait ${timeLeft > 0 ? timeLeft : 0}s`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}