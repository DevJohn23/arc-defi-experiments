'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { erc20ABI } from '@/abis/erc20';
import { ARC_DCA_ADDRESS, USDC_ADDRESS, MOCK_WETH_ADDRESS, arcDCAAbi } from '@/lib/constants';

// CORREÇÃO CRÍTICA 1: USDC na interface ERC-20 da Arc usa 6 decimais, não 18.
const USDC_DECIMALS = 6; 

export function ArcDCA() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const [totalDeposit, setTotalDeposit] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [interval, setInterval] = useState('60'); 

  // Hashes
  const [approveHash, setApproveHash] = useState<`0x${string}`>();
  const [createPositionHash, setCreatePositionHash] = useState<`0x${string}`>();

  const parsedTotalDeposit = totalDeposit ? parseUnits(totalDeposit, USDC_DECIMALS) : BigInt(0);

  // Leitura do Allowance com status de Loading
  const { data: allowance, isLoading: isAllowanceLoading, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: USDC_ADDRESS,
    functionName: 'allowance',
    args: [address!, ARC_DCA_ADDRESS],
    query: { enabled: !!address },
  });

  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isCreatePositionPending, isSuccess: isCreatePositionSuccess } =
    useWaitForTransactionReceipt({ hash: createPositionHash });
  
  // Atualiza após aprovação
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Limpa após criar
  useEffect(() => {
    if (isCreatePositionSuccess) {
      setTotalDeposit('');
      setBuyAmount('');
      setTimeout(() => refetchAllowance(), 1000);
    }
  }, [isCreatePositionSuccess, refetchAllowance]);

  const handleApprove = () => {
    writeContract({
      abi: erc20ABI,
      address: USDC_ADDRESS,
      functionName: 'approve',
      args: [ARC_DCA_ADDRESS, parsedTotalDeposit],
      gas: 2000000n, // Segurança de Gás
    }, {
      onSuccess: (hash) => setApproveHash(hash),
      onError: (err) => console.error(err),
    });
  };

  const handleCreatePosition = () => {
    if (!totalDeposit || !buyAmount) return;

    const parsedBuyAmount = parseUnits(buyAmount, USDC_DECIMALS);
    
    writeContract({
      abi: arcDCAAbi,
      address: ARC_DCA_ADDRESS,
      functionName: 'createPosition',
      args: [
        USDC_ADDRESS,
        MOCK_WETH_ADDRESS,
        parsedBuyAmount,
        BigInt(interval),
        parsedTotalDeposit,
      ],
      gas: 2000000n, // Segurança de Gás
    }, {
      onSuccess: (hash) => setCreatePositionHash(hash),
      onError: (err) => console.error(err),
    });
  };
  
  // CORREÇÃO CRÍTICA 2: Lógica de exibição do botão mais segura
  const isReadyToCheck = allowance !== undefined && !isAllowanceLoading;
  const needsApproval = isReadyToCheck && allowance < parsedTotalDeposit;
  const isPending = isApprovePending || isCreatePositionPending;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Coluna da Esquerda: Formulário */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-white">Setup Your Auto-Trade Bot</h2>
        <p className="text-gray-400 mb-6">Deposit USDC to automatically buy WETH.</p>
        
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
            placeholder="Buy Amount (USDC)"
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
          ) : !isReadyToCheck ? (
            <button disabled className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded animate-pulse">
              Checking Allowance...
            </button>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isPending || !totalDeposit}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded transition disabled:opacity-50"
            >
              {isApprovePending ? 'Approving...' : `1. Approve ${totalDeposit} USDC`}
            </button>
          ) : (
            <button
              onClick={handleCreatePosition}
              disabled={isPending || !totalDeposit}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition disabled:opacity-50"
            >
              {isCreatePositionPending ? 'Activating...' : '2. Activate Bot 🚀'}
            </button>
          )}

          {isCreatePositionSuccess && (
             <div className="p-3 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-center">
               ✅ Success! Bot Activated.
             </div>
          )}
        </div>
      </div>

      {/* Coluna da Direita: Explicação */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center">
         <h3 className="text-xl font-semibold mb-4 text-white">How it Works</h3>
         <ol className="list-decimal list-inside text-gray-400 space-y-3">
            <li><span className="text-white font-medium">Approve:</span> Allow the contract to use your USDC.</li>
            <li><span className="text-white font-medium">Deposit:</span> Send USDC to the secure vault.</li>
            <li><span className="text-white font-medium">Automate:</span> The bot buys WETH every {interval}s.</li>
            <li><span className="text-white font-medium">Profit:</span> WETH is sent to your wallet.</li>
         </ol>
         <div className="mt-6 p-4 bg-blue-900/20 rounded border border-blue-500/30 text-sm text-blue-200">
            ℹ️ <strong>Note:</strong> USDC on Arc ERC-20 uses 6 decimals. Ensure you are approving the correct amount.
         </div>
      </div>
    </div>
  );
}