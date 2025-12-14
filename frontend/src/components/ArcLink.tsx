'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, encodePacked, parseUnits, zeroAddress, toHex } from 'viem';

// ArcLink Contract Address
const ARC_LINK_ADDRESS = '0x5241c547b20AFf18Dcdd5CeB3bd12117643a8Fc2';
// EURC Token Address (replace with actual if different, using official from progress report)
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

// Mini ABI for ArcLink
const arcLinkAbi = [
    {
        "type": "function",
        "name": "createLink",
        "inputs": [
            { "name": "secretHash", "type": "bytes32", "internalType": "bytes32" },
            { "name": "token", "type": "address", "internalType": "address" },
            { "name": "amount", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "claimLink",
        "inputs": [
            { "name": "secret", "type": "string", "internalType": "string" },
            { "name": "recipient", "type": "address", "internalType": "address" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    }
];

export function ArcLink() {
    const { address } = useAccount();
    const { writeContract: writeCreateLink, data: createHash, error: createError, isPending: isCreatingPending, reset: resetCreateLink } = useWriteContract();
    const { writeContract: writeClaimLink, data: claimHash, error: claimError, isPending: isClaimingPending, reset: resetClaimLink } = useWriteContract();

    // --- CREATE LINK STATE ---
    const [createAmount, setCreateAmount] = useState('');
    const [createSecret, setCreateSecret] = useState('');
    const [createTokenType, setCreateTokenType] = useState<'usdc' | 'eurc'>('usdc');
    const [generatedLink, setGeneratedLink] = useState('');

    // --- CLAIM LINK STATE ---
    const [claimSecret, setClaimSecret] = useState('');

    const { isLoading: createIsConfirming, isSuccess: createIsConfirmed } = useWaitForTransactionReceipt({ hash: createHash });
    const { isLoading: claimIsConfirming, isSuccess: claimIsConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

    useEffect(() => {
        setGeneratedLink('');
    }, [createAmount, createSecret]);

    useEffect(() => {
        if (createIsConfirmed) {
            setTimeout(() => {
                setCreateAmount('');
                setCreateSecret('');
                resetCreateLink();
                setGeneratedLink(''); // Clear the generated link as well
            }, 5000); // Display success message for 5 seconds
        }
    }, [createIsConfirmed, resetCreateLink, setCreateAmount, setCreateSecret, setGeneratedLink]);

    useEffect(() => {
        if (claimIsConfirmed) {
            setTimeout(() => {
                setClaimSecret('');
                resetClaimLink();
            }, 5000); // Display success message for 5 seconds
        }
    }, [claimIsConfirmed, resetClaimLink, setClaimSecret]);

    const handleCreateLink = async () => {
        if (!createAmount || !createSecret) {
            alert('Please provide an amount and a secret.');
            return;
        }

        const isNative = createTokenType === 'usdc';
        const secretHash = keccak256(encodePacked(['string'], [createSecret]));
        
        const claimUrl = `${window.location.origin}?secret=${encodeURIComponent(createSecret)}`;
        setGeneratedLink(claimUrl);

        if (isNative) {
            const parsedAmount = parseUnits(createAmount, 18);
            await writeCreateLink({
                address: ARC_LINK_ADDRESS,
                abi: arcLinkAbi,
                functionName: 'createLink',
                args: [secretHash, '0x0000000000000000000000000000000000000000', parsedAmount],
                value: parsedAmount,
            });
        } else {
            // ERC20 Path (EURC) - NOTE: This will fail without an approval step.
            const parsedAmount = parseUnits(createAmount, 6);
            await writeCreateLink({
                address: ARC_LINK_ADDRESS,
                abi: arcLinkAbi,
                functionName: 'createLink',
                args: [secretHash, EURC_ADDRESS, parsedAmount],
                value: 0n,
            });
        }
    };
    
    const handleClaimLink = async () => {
        if (!claimSecret || !address) {
            alert('Please provide the secret and connect your wallet.');
            return;
        }

        await writeClaimLink({
            address: ARC_LINK_ADDRESS,
            abi: arcLinkAbi,
            functionName: 'claimLink',
            args: [claimSecret, address],
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            {/* Create Link Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                <h2 className="text-2xl font-semibold mb-4">Create a Payment Link</h2>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Token</label>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setCreateTokenType('usdc')} className={`px-4 py-2 rounded ${createTokenType === 'usdc' ? 'bg-blue-600' : 'bg-gray-600'}`}>Native USDC</button>
                        <button onClick={() => setCreateTokenType('eurc')} className={`px-4 py-2 rounded ${createTokenType === 'eurc' ? 'bg-blue-600' : 'bg-gray-600'}`}>EURC (Token)</button>
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="create-amount" className="block text-sm font-medium mb-1">Amount</label>
                    <input
                        id="create-amount"
                        type="text"
                        value={createAmount}
                        onChange={(e) => setCreateAmount(e.target.value)}
                        placeholder="e.g., 100"
                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="create-secret" className="block text-sm font-medium mb-1">Secret Password</label>
                    <input
                        id="create-secret"
                        type="password"
                        value={createSecret}
                        onChange={(e) => setCreateSecret(e.target.value)}
                        placeholder="Enter a strong password"
                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2"
                    />
                </div>

                <button
                    onClick={handleCreateLink}
                    disabled={isCreatingPending || !createAmount || !createSecret}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 rounded-md py-2 font-semibold"
                >
                    {isCreatingPending ? 'Creating...' : 'Create Link'}
                </button>

                {generatedLink && createIsConfirmed && (
                     <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded-md">
                        <p className="font-semibold">Link Created! Share this link to claim:</p>
                        <input
                            type="text"
                            readOnly
                            value={generatedLink}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 mt-2 text-sm"
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                )}
                {createError && (
                    <div className="text-red-400 mt-4">
                        Error creating link: {createError.message}
                    </div>
                )}
            </div>

            {/* Claim Link Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                <h2 className="text-2xl font-semibold mb-4">Claim from a Link</h2>
                
                <div className="mb-4">
                    <label htmlFor="claim-secret" className="block text-sm font-medium mb-1">Secret Password</
                    label>
                    <input
                        id="claim-secret"
                        type="password"
                        value={claimSecret}
                        onChange={(e) => setClaimSecret(e.target.value)}
                        placeholder="Enter the secret from the link"
                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2"
                    />
                </div>
                
                <button
                    onClick={handleClaimLink}
                    disabled={isClaimingPending || !claimSecret}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 rounded-md py-2 font-semibold"
                >
                    {isClaimingPending ? 'Claiming...' : 'Claim Funds'}
                </button>

                {claimIsConfirming && <p className="text-center mt-4">Waiting for confirmation...</p>}
                {claimIsConfirmed && claimHash && <p className="text-center text-green-400 mt-4">Funds claimed successfully!</p>}
                {claimError && (
                    <div className="text-red-400 mt-4">
                        Error claiming funds: {claimError.message}
                    </div>
                )}
            </div>
        </div>
    );
}
