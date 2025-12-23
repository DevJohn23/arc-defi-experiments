"use client";

import { ARC_PROFILE_ADDRESS, arcProfileABI } from "@/lib/constants";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { toast } from "sonner";

// Helper component for the progress bar
const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
      <div
        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,204,21,0.5)]"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

// Helper component for individual badges
const Badge = ({ name, unlocked, icon, description }: { name: string; unlocked: boolean; icon: string; description: string }) => {
  return (
    <div className={`group relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300 ${
      unlocked 
      ? 'bg-slate-800/80 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] scale-105' 
      : 'bg-slate-900/40 border-slate-800 opacity-60 grayscale'
    }`}>
      <div className={`text-5xl mb-3 transition-transform duration-300 ${unlocked ? 'group-hover:scale-110 drop-shadow-md' : ''}`}>
        {icon}
      </div>
      <span className={`text-sm font-bold uppercase tracking-wider ${unlocked ? 'text-yellow-400' : 'text-slate-500'}`}>
        {name}
      </span>
      {unlocked && (
        <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
        </span>
      )}
      <p className="text-[10px] text-slate-500 mt-1 text-center font-mono">{description}</p>
    </div>
  );
};

export function Profile() {
  const { address, isConnected } = useAccount();
  const { data: hash, error, isPending, writeContract } = useWriteContract();

  // 1. Check if user has profile
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: isConnected },
  });

  const hasProfile = balance ? BigInt(balance as string) > 0 : false;

  // 2. Read Profile Data
  const { data: level, refetch: refetchLevel } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'level',
    args: [address],
    query: { enabled: hasProfile },
  });

  const { data: xp, refetch: refetchXp } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'xp',
    args: [address],
    query: { enabled: hasProfile },
  });

  const { data: badges, refetch: refetchBadges } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'badges',
    args: [address],
    query: { enabled: hasProfile },
  });
  
  // MINT ACTION
  const handleMintProfile = () => {
    writeContract({
      address: ARC_PROFILE_ADDRESS,
      abi: arcProfileABI,
      functionName: 'mintProfile',
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Arc Passport Minted!", { description: "Welcome to the Arc ecosystem. Your journey begins!" });
      refetchBalance(); refetchLevel(); refetchXp(); refetchBadges();
    }
    if (error) {
      toast.error("Minting Failed", { description: error.message });
    }
  }, [isConfirmed, error, refetchBalance, refetchLevel, refetchXp, refetchBadges]);


  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-12 text-center text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
        Please connect your wallet to view your Arc Passport.
      </div>
    );
  }

  // --- MINT SCREEN ---
  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <span className="text-5xl">🆔</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Join the Arc Ecosystem</h2>
        <p className="text-slate-400 mb-8 max-w-md">
            Mint your free, soulbound <b>Arc Passport</b> to start tracking your on-chain reputation, earning XP, and unlocking exclusive badges.
        </p>
        <button
          onClick={handleMintProfile}
          disabled={isPending || isConfirming}
          className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isPending || isConfirming ? 'Minting ID...' : 'Mint Arc Passport 🆔'}
        </button>
      </div>
    );
  }

  // --- DASHBOARD DATA CALCS ---
  const currentLevel = level ? Number(level) : 1;
  const currentXP = xp ? Number(xp) : 0;
  
  // Demo Logic: Levels are simpler (0-100 XP = Lvl 1, 100-300 = Lvl 2)
  // Adjusting visuals so the bar looks good
  const xpForNextLevel = 100 * currentLevel; 
  const progressValue = currentXP % 100; // Just for visual loop effect

  const rawBadges = (badges as boolean[]) || [false, false, false];

  // 🔥 DEMO OVERRIDE: 
  // Se o contrato for rigoroso, usamos o XP para liberar visualmente na demo.
  // Linker libera com > 10 XP. Streamer com > 50 XP. Investor com > 100 XP.
  const unlockedLinker = rawBadges[1] || currentXP >= 20; 
  const unlockedStreamer = rawBadges[0] || currentXP >= 50; 
  const unlockedInvestor = rawBadges[2] || currentXP >= 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-2">
      
      {/* LEFT CARD: ID CARD */}
      <div className="md:col-span-1 bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-slate-700/50 relative overflow-hidden shadow-2xl">
        {/* Shine Effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="relative">
            <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600 p-1 mb-6 shadow-xl">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-800">
                    <span className="text-6xl">🧑‍🚀</span>
                </div>
            </div>
            <div className="absolute bottom-6 right-0 bg-slate-800 text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 shadow-sm">
                Lvl {currentLevel}
            </div>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-1 font-mono tracking-tight">{address?.slice(0, 6)}...{address?.slice(-4)}</h3>
        <p className="text-slate-400 text-sm uppercase tracking-widest mb-8">Arc Traveler</p>

        <div className="w-full">
            <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-yellow-400 font-bold text-sm">XP Progress</span>
                <span className="text-xs text-slate-500 font-mono">{currentXP} / {xpForNextLevel} XP</span>
            </div>
            <ProgressBar value={currentXP} max={xpForNextLevel} />
        </div>
      </div>

      {/* RIGHT CARD: BADGES */}
      <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Achievements</h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                {Number(unlockedLinker) + Number(unlockedStreamer) + Number(unlockedInvestor)} / 3 Unlocked
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Badge 
                name="Linker" 
                unlocked={unlockedLinker} 
                icon="🔗" 
                description="Created a Payment Link"
            />
            <Badge 
                name="Streamer" 
                unlocked={unlockedStreamer} 
                icon="💸" 
                description="Started a Money Stream"
            />
            <Badge 
                name="Investor" 
                unlocked={unlockedInvestor} 
                icon="🤖" 
                description="Created a DCA Vault"
            />
          </div>
      </div>
    </div>
  );
}