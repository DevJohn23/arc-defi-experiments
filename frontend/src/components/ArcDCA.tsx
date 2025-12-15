'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { erc20ABI } from '@/abis/erc20';
import { ARC_DCA_ADDRESS, USDC_ADDRESS, MOCK_WETH_ADDRESS, arcDCAAbi } from '@/lib/constants';

const USDC_DECIMALS = 18; // USDC has 18 decimals on Arc Testnet

export function ArcDCA() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  // Form State
  const [totalDeposit, setTotalDeposit] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [interval, setInterval] = useState('60'); // Default to 60 seconds

  // Transaction Hashes
  const [approveHash, setApproveHash] = useState<`0x${string}`>();
  const [createPositionHash, setCreatePositionHash] = useState<`0x${string}`>();

  const parsedTotalDeposit = totalDeposit ? parseUnits(totalDeposit, USDC_DECIMALS) : BigInt(0);

  // Read USDC allowance for the ArcDCA contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20ABI,
    address: USDC_ADDRESS,
    functionName: 'allowance',
    args: [address!, ARC_DCA_ADDRESS],
    query: { enabled: !!address },
  });

  // Watcher for the approve transaction
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Watcher for the create position transaction
  const { isLoading: isCreatePositionPending, isSuccess: isCreatePositionSuccess } =
    useWaitForTransactionReceipt({
      hash: createPositionHash,
    });
  
  // Effect to refetch allowance after a successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      console.log('✅ Approval successful! Refetching allowance...');
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Cleanup effect after creating a position
  useEffect(() => {
    if (isCreatePositionSuccess) {
      console.log('✅ DCA Position Created! Cleaning up UI...');
      setTotalDeposit('');
      setBuyAmount('');
      setInterval('60');
      // Small delay to let blockchain settle before refetching
      setTimeout(() => {
        refetchAllowance();
        console.log('🔄 Allowance refetched');
      }, 1000);
    }
  }, [isCreatePositionSuccess, refetchAllowance]);

  const handleApprove = () => {
    writeContract({
      abi: erc20ABI,
      address: USDC_ADDRESS,
      functionName: 'approve',
      args: [ARC_DCA_ADDRESS, parsedTotalDeposit],
    },
    {
      onSuccess: (hash) => setApproveHash(hash),
      onError: (error) => alert(`Approval Failed: ${error.message}`),
    });
  };

  const handleCreatePosition = () => {
    if (!totalDeposit || !buyAmount || !interval) {
      alert('Please fill all fields');
      return;
    }

    const parsedBuyAmount = parseUnits(buyAmount, USDC_DECIMALS);
    if (parsedTotalDeposit < parsedBuyAmount) {
      alert('Total deposit must be greater than or equal to the amount per trade.');
      return;
    }
    
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
    },
    {
      onSuccess: (hash) => setCreatePositionHash(hash),
      onError: (error) => alert(`Activation Failed: ${error.message}`),
    });
  };
  
  const needsApproval = allowance !== undefined && allowance < parsedTotalDeposit;
  const isPending = isApprovePending || isCreatePositionPending;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">Setup Your Auto-Trade Bot</h2>
        <p className="text-gray-400 mb-6">Deposit USDC to automatically buy WETH at set intervals.</p>
        
        <div className="space-y-4">
          <input
            type="number"
            placeholder="Total Deposit (USDC)"
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            value={totalDeposit}
            onChange={(e) => setTotalDeposit(e.target.value)}
            disabled={isPending}
          />
          <input
            type="number"
            placeholder="Buy Amount per Trade (USDC)"
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            disabled={isPending}
          />
          <input
            type="number"
            placeholder="Interval (seconds)"
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            disabled={isPending}
          />

          {address ? (
            needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isPending || !totalDeposit}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isApprovePending ? 'Approving...' : `1. Approve ${totalDeposit || '...'} USDC`}
              </button>
            ) : (
              <button
                onClick={handleCreatePosition}
                disabled={isPending || !totalDeposit || !buyAmount || !interval}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isCreatePositionPending ? 'Activating...' : '2. Activate Bot'}
              </button>
            )
          ) : (
            <button
              disabled={true}
              className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded cursor-not-allowed"
            >
              Connect Wallet to Get Started
            </button>
          )}

          {isApproveSuccess && approveHash && (
             <div className="text-green-400 text-center mt-2">
               Approved! You can now activate the bot.
             </div>
          )}
          {isCreatePositionSuccess && createPositionHash && (
             <div className="text-green-400 text-center mt-2">
               Success! Your DCA bot is now active.
             </div>
          )}
        </div>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center">
         <h3 className="text-xl font-semibold mb-2">How it Works</h3>
         <ol className="list-decimal list-inside text-gray-400 space-y-2">
            <li><span className="font-semibold text-white">Approve USDC:</span> You give the contract permission to use your USDC.</li>
            <li><span className="font-semibold text-white">Activate Bot:</span> You lock your USDC in the contract and set the trading rules.</li>
            <li><span className="font-semibold text-white">Auto-Trading:</span> The contract automatically buys WETH for you at the specified interval.</li>
            <li><span className="font-semibold text-white">Receive WETH:</span> The purchased WETH is sent directly to your wallet.</li>
         </ol>
      </div>
    </div>
  );
}
