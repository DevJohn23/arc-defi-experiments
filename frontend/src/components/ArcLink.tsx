'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, encodePacked, parseUnits, parseEther, zeroAddress } from 'viem';
import confetti from 'canvas-confetti';
import { erc20ABI } from '@/abis/erc20'; 
import { arcLinkABI } from '../abis/arcLink'; // Importando a ABI correta
import { ARC_LINK_ADDRESS, EURC_ADDRESS } from '@/lib/constants'; // Importando constantes atualizadas

// Helper para Copiar
function CopyToClipboardButton({ textToCopy }: { textToCopy: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => console.error('Failed to copy text: ', err));
    };

    return (
        <button
            onClick={handleCopy}
            className={`mt-3 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                copied 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
            }`}
        >
            {copied ? (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    Link Copied!
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    Copy Claim Link
                </>
            )}
        </button>
    );
}

export function ArcLink() {
    const { address } = useAccount();
    const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();

    // --- STATES ---
    const [createAmount, setCreateAmount] = useState('');
    const [createSecret, setCreateSecret] = useState('');
    const [createTokenType, setCreateTokenType] = useState<'usdc' | 'eurc'>('usdc');
    const [generatedLink, setGeneratedLink] = useState('');
    const [claimSecret, setClaimSecret] = useState('');
    
    // Controle de fluxo (Approve vs Create vs Claim)
    const [currentAction, setCurrentAction] = useState<'approve' | 'create' | 'claim' | null>(null);

    // Watcher de Transação
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    // --- LÓGICA DE APROVAÇÃO (EURC) ---
    const parsedAmount = createAmount 
        ? (createTokenType === 'usdc' ? parseEther(createAmount) : parseUnits(createAmount, 6)) 
        : 0n;

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        abi: erc20ABI,
        address: EURC_ADDRESS,
        functionName: 'allowance',
        args: [address!, ARC_LINK_ADDRESS],
        query: { enabled: !!address && createTokenType === 'eurc' },
    });

    const needsApproval = createTokenType === 'eurc' && (allowance || 0n) < parsedAmount;

    // --- EFFECTS ---
    useEffect(() => {
        setGeneratedLink('');
    }, [createAmount, createSecret, createTokenType]);

    useEffect(() => {
        if (isConfirmed) {
            // Se acabou de criar o link
            if (currentAction === 'create') {
                const claimUrl = `${window.location.origin}?secret=${encodeURIComponent(createSecret)}`;
                setGeneratedLink(claimUrl);
                // Reset parcial
                if(createTokenType === 'eurc') refetchAllowance();
            }
            
            // Se acabou de clamar o link (Sucesso!)
            if (currentAction === 'claim') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#db2777', '#be185d', '#ec4899'] // Tons de Rosa
                });
                setClaimSecret('');
            }

            // Se foi apenas approve
            if (currentAction === 'approve') {
                refetchAllowance();
            }

            setCurrentAction(null); // Reseta ação
        }
    }, [isConfirmed, currentAction, createSecret, createTokenType, refetchAllowance]);


    // --- HANDLERS ---
    const handleApprove = () => {
        setCurrentAction('approve');
        writeContract({
            abi: erc20ABI,
            address: EURC_ADDRESS,
            functionName: 'approve',
            args: [ARC_LINK_ADDRESS, parsedAmount],
        });
    };

    const handleCreateLink = () => {
        if (!createAmount || !createSecret) return;
        setCurrentAction('create');

        const hash = keccak256(encodePacked(['string'], [createSecret]));
        
        // Se for USDC (Nativo), manda o address(0) para o contrato saber
        const tokenAddr = createTokenType === 'usdc' ? zeroAddress : EURC_ADDRESS;
        const value = createTokenType === 'usdc' ? parsedAmount : 0n;

        writeContract({
            abi: arcLinkABI, // Usando a ABI importada
            address: ARC_LINK_ADDRESS, // Usando endereço atualizado
            functionName: 'createLink',
            args: [hash, tokenAddr, parsedAmount],
            value: value,
        });
    };
    
    const handleClaimLink = () => {
        if (!claimSecret || !address) return;
        setCurrentAction('claim');

        writeContract({
            abi: arcLinkABI,
            address: ARC_LINK_ADDRESS,
            functionName: 'claimLink',
            args: [claimSecret, address],
        });
    };

    const isPending = isTxPending || isConfirming;

    return (
        <div className="space-y-8 relative pb-10">
            
            {/* Título da Seção */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-pink-500 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.5)]"></div>
                <h2 className="text-2xl font-bold text-white">Payment Links</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* --- CARD 1: CRIAR LINK (ESQUERDA) --- */}
                <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 opacity-70"></div>
                    
                    <h3 className="text-xl font-bold mb-6 text-white">Create New Link</h3>
                    
                    {/* Seletor de Token */}
                    <div className="flex bg-black/40 p-1 rounded-xl border border-gray-700/50 mb-6">
                        <button 
                            onClick={() => setCreateTokenType('usdc')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${createTokenType === 'usdc' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Native USDC
                        </button>
                        <button 
                            onClick={() => setCreateTokenType('eurc')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${createTokenType === 'eurc' ? 'bg-yellow-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            EURC
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Amount</span>
                            <input
                                type="number"
                                value={createAmount}
                                onChange={(e) => setCreateAmount(e.target.value)}
                                placeholder="0.00"
                                disabled={isPending}
                                className="w-full pl-20 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors text-right font-mono"
                            />
                        </div>

                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-500 text-sm">Secret</span>
                            <input
                                type="password"
                                value={createSecret}
                                onChange={(e) => setCreateSecret(e.target.value)}
                                placeholder="Secret Password"
                                disabled={isPending}
                                className="w-full pl-20 pr-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
                            />
                        </div>

                        {!address ? (
                            <button disabled className="w-full bg-gray-700 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed border border-gray-600">
                                Connect Wallet
                            </button>
                        ) : needsApproval ? (
                             <button
                                onClick={handleApprove}
                                disabled={isPending || !createAmount}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-yellow-900/20"
                            >
                                {isPending ? 'Approving...' : `1. Approve ${createAmount} EURC`}
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateLink}
                                disabled={isPending || !createAmount || !createSecret}
                                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-pink-900/30"
                            >
                                {isPending ? 'Creating Link...' : '2. Generate Link 🔗'}
                            </button>
                        )}
                    </div>

                    {/* Área de Sucesso (O Link Gerado) */}
                    {generatedLink && (
                        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 mb-2 text-green-400 font-bold text-sm uppercase tracking-wider">
                                <span className="bg-green-500/20 p-1 rounded-full">✓</span> Link Ready
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={generatedLink}
                                className="w-full bg-black/50 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono mb-1"
                                onFocus={(e) => e.target.select()}
                            />
                            <CopyToClipboardButton textToCopy={generatedLink} />
                        </div>
                    )}
                </div>

                {/* --- CARD 2: REIVINDICAR (DIREITA) --- */}
                <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50 relative">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 opacity-50"></div>
                     
                    <h2 className="text-xl font-bold mb-6 text-white">Claim Funds</h2>
                    
                    <div className="space-y-6">
                        <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-200 text-sm leading-relaxed">
                            Past the secret link below or enter the password manually to unlock the funds directly to your wallet.
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-2 block ml-1">Secret Password</label>
                            <input
                                type="password"
                                value={claimSecret}
                                onChange={(e) => setClaimSecret(e.target.value)}
                                placeholder="Enter secret..."
                                className="w-full p-4 bg-black/30 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>
                        
                        <button
                            onClick={handleClaimLink}
                            disabled={isPending || !claimSecret || !address}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl transition duration-300 border border-gray-600 hover:border-pink-500/50 hover:text-pink-400 group"
                        >
                            {isPending ? 'Processing...' : (
                                <span className="flex items-center justify-center gap-2">
                                    Unlock Funds <span className="group-hover:translate-x-1 transition-transform">🔓</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}