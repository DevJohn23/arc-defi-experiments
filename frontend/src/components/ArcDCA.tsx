'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { erc20ABI } from '@/abis/erc20';
import { ARC_DCA_ADDRESS, USDC_ADDRESS, MOCK_WETH_ADDRESS, arcDCAAbi } from '@/lib/constants';

// USDC na interface ERC-20 da Arc usa 6 decimais.
const USDC_DECIMALS = 6; 

export function ArcDCA() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // --- FORM STATES ---
  const [totalDeposit, setTotalDeposit] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [interval, setInterval] = useState('60'); 

  // --- HASHES & LOADING ---
  const [txHash, setTxHash] = useState<`0x${string}`>();

  const parsedTotalDeposit = totalDeposit ? parseUnits(totalDeposit, USDC_DECIMALS) : BigInt(0);

  // 1. LEITURA: Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: USDC_ADDRESS,
    functionName: 'allowance',
    args: [address!, ARC_DCA_ADDRESS],
    query: { enabled: !!address },
  });

  // 2. LEITURA: Quantas posições existem no total?
  const { data: nextPositionId, refetch: refetchCount } = useReadContract({
    abi: arcDCAAbi,
    address: ARC_DCA_ADDRESS,
    functionName: 'nextPositionId',
  });

  // 3. LEITURA EM MASSA: Puxar dados de todas as posições
  // Cria um array de IDs com segurança de tipo
  const count = nextPositionId ? Number(nextPositionId) : 0;
  const ids = Array.from({ length: count }, (_, i) => BigInt(i));
  
  const { data: allPositions, refetch: refetchPositions } = useReadContracts({
    contracts: ids.map(id => ({
      abi: arcDCAAbi as any, // "as any" resolve o conflito de tipos estritos do TS
      address: ARC_DCA_ADDRESS as `0x${string}`,
      functionName: 'positions',
      args: [id],
    })),
    query: { enabled: ids.length > 0 }
  });

  // 4. FILTRAGEM E MAPEAMENTO SEGURO
  // Aqui resolvemos o erro de "Spread types". Mapeamos manualmente os campos.
  const myPositions = allPositions
    ?.map((result, index) => {
      if (result.status !== 'success' || !result.result) return null;
      
      // O resultado vem como um Array ou Objeto, dependendo do Viem.
      // Vamos tratar como 'any' e mapear manualmente para garantir.
      const data = result.result as any;

      // Se o retorno for um array (comum em smart contracts):
      // [owner, tokenIn, tokenOut, amountPerTrade, interval, lastExecution, totalBalance, isActive]
      // Se for objeto, acessamos as chaves. O TS não sabe, então forçamos a leitura segura:
      return {
        id: BigInt(index),
        owner: data[0] ?? data.owner,
        tokenIn: data[1] ?? data.tokenIn,
        tokenOut: data[2] ?? data.tokenOut,
        amountPerTrade: data[3] ?? data.amountPerTrade,
        interval: data[4] ?? data.interval,
        lastExecution: data[5] ?? data.lastExecution,
        totalBalance: data[6] ?? data.totalBalance,
        isActive: data[7] ?? data.isActive, // Use ?? para booleanos
      };
    })
    .filter((pos) => pos !== null && pos.owner === address);

  // --- WATCHER DE TRANSAÇÃO ---
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Atualiza tudo após qualquer sucesso
  useEffect(() => {
    if (isTxSuccess) {
      refetchAllowance();
      refetchCount();
      refetchPositions();
      setTotalDeposit(''); // Limpa form
      setTxHash(undefined); // Limpa hash para permitir novas ações
    }
  }, [isTxSuccess, refetchAllowance, refetchCount, refetchPositions]);

  // --- ACTIONS ---

  const handleApprove = () => {
    writeContract({
      abi: erc20ABI,
      address: USDC_ADDRESS,
      functionName: 'approve',
      args: [ARC_DCA_ADDRESS, parsedTotalDeposit],
      gas: 2000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  const handleCreatePosition = () => {
    if (!totalDeposit || !buyAmount) return;
    const parsedBuyAmount = parseUnits(buyAmount, USDC_DECIMALS);
    
    writeContract({
      abi: arcDCAAbi,
      address: ARC_DCA_ADDRESS,
      functionName: 'createPosition',
      args: [USDC_ADDRESS, MOCK_WETH_ADDRESS, parsedBuyAmount, BigInt(interval), parsedTotalDeposit],
      gas: 2000000n,
    }, { onSuccess: (hash) => setTxHash(hash) });
  };

  const handleExecute = (posId: bigint) => {
    writeContract({
      abi: arcDCAAbi,
      address: ARC_DCA_ADDRESS,
      functionName: 'executeDCA',
      args: [posId],
      gas: 3000000n, // Gás um pouco maior para a troca (Swap)
    }, { onSuccess: (hash) => setTxHash(hash) });
  };
  
  // UI LOGIC
  const needsApproval = allowance !== undefined && allowance < parsedTotalDeposit;
  const isPending = isTxConfirming;

  return (
    <div className="space-y-12">
      {/* SEÇÃO 1: CRIAR NOVO ROBÔ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-white">Create Auto-Trade Vault</h2>
          <div className="space-y-4">
            <input
              type="number"
              placeholder="Total Deposit (USDC)"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-purple-500"
              value={totalDeposit}
              onChange={(e) => setTotalDeposit(e.target.value)}
              disabled={isPending}
            />
            <input
              type="number"
              placeholder="Buy Amount per Trade (USDC)"
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
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded transition disabled:opacity-50"
              >
                {isPending ? 'Approving...' : `1. Approve ${totalDeposit} USDC`}
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
            
            {isTxSuccess && <p className="text-green-400 text-center">✅ Transaction Confirmed!</p>}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center">
           <h3 className="text-xl font-semibold mb-4 text-white">How it Works</h3>
           <ol className="list-decimal list-inside text-gray-400 space-y-3">
              <li>Approve USDC usage.</li>
              <li>Deposit into the vault.</li>
              <li>Use the dashboard below to <strong>Execute Trades</strong>.</li>
              <li>Profits go straight to your wallet.</li>
           </ol>
        </div>
      </div>

      {/* SEÇÃO 2: DASHBOARD (MEUS INVESTIMENTOS) */}
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
              // Cálculos de tempo para mostrar se está pronto para executar
              const lastExec = Number(pos.lastExecution);
              const intervalSec = Number(pos.interval);
              const nextExec = lastExec + intervalSec;
              const now = Math.floor(Date.now() / 1000);
              const isReady = now >= nextExec;
              const timeLeft = nextExec - now;

              return (
                <div key={pos.id} className="bg-slate-800 rounded-xl p-5 border border-slate-600 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-white text-lg">Vault #{pos.id.toString()}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${pos.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {pos.isActive ? 'RUNNING' : 'PAUSED'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300 mb-6">
                    <div className="flex justify-between">
                      <span>Vault Balance:</span>
                      <span className="text-white font-mono">{formatUnits(pos.totalBalance, USDC_DECIMALS)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trade Size:</span>
                      <span className="text-white font-mono">{formatUnits(pos.amountPerTrade, USDC_DECIMALS)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interval:</span>
                      <span className="text-white">{pos.interval.toString()}s</span>
                    </div>
                  </div>

                  {/* BOTÃO DE AÇÃO */}
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
                          ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-500/25' 
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isPending ? 'Executing...' : isReady ? '⚡ Force Run Trade' : `Wait ${timeLeft}s`}
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