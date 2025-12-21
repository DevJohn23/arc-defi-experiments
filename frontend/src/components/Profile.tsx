"use client";

import { ARC_PROFILE_ADDRESS, arcProfileABI } from "@/lib/constants";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { toast } from "sonner";

// Helper component for the progress bar
const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-slate-700 rounded-full h-2.5">
      <div
        className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

// Helper component for individual badges
const Badge = ({ name, unlocked, icon }: { name: string; unlocked: boolean; icon: string }) => {
  return (
    <div className={`flex flex-col items-center p-4 rounded-lg transition-all duration-300 ${
      unlocked ? 'bg-slate-700/50' : 'bg-slate-800/50'
    }`}>
      <div className={`text-5xl ${unlocked ? 'grayscale-0' : 'grayscale'}`}>{icon}</div>
      <span className={`mt-2 text-sm font-semibold ${unlocked ? 'text-yellow-400' : 'text-slate-500'}`}>
        {name}
      </span>
    </div>
  );
};


export function Profile() {
  const { address, isConnected } = useAccount();
  const { data: hash, error, isPending, writeContract } = useWriteContract();

  // Check if the user has a profile (balance of NFTs > 0)
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: isConnected,
    },
  });

  const hasProfile = balance ? BigInt(balance as string) > 0 : false;

  // Read profile data if the user has one
  const { data: level, refetch: refetchLevel } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'level',
    args: [address],
    query: {
      enabled: hasProfile,
    },
  });

  const { data: xp, refetch: refetchXp } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'xp',
    args: [address],
    query: {
      enabled: hasProfile,
    },
  });

  const { data: badges, refetch: refetchBadges } = useReadContract({
    address: ARC_PROFILE_ADDRESS,
    abi: arcProfileABI,
    functionName: 'badges',
    args: [address],
    query: {
      enabled: hasProfile,
    },
  });
  
  const handleMintProfile = () => {
    writeContract({
      address: ARC_PROFILE_ADDRESS,
      abi: arcProfileABI,
      functionName: 'mintProfile',
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
    
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Arc Passport Minted!", {
        description: "Welcome to the Arc ecosystem. Your journey begins!",
      });
      refetchBalance();
      refetchLevel();
      refetchXp();
      refetchBadges();
    }
    if (error) {
      toast.error("Minting Failed", {
        description: error.message,
      });
    }
  }, [isConfirmed, error, refetchBalance, refetchLevel, refetchXp, refetchBadges]);


  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-slate-400">
        Please connect your wallet to view your Arc Passport.
      </div>
    );
  }

  // --- Render logic based on profile existence ---
  
  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Join the Arc Ecosystem</h2>
        <p className="text-slate-400 mb-6">Mint your free, soulbound Arc Passport to start earning XP and badges.</p>
        <button
          onClick={handleMintProfile}
          disabled={isPending || isConfirming}
          className="px-8 py-4 bg-yellow-500 text-slate-900 font-bold rounded-lg hover:bg-yellow-400 transition-all disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Minting...' : 'Mint Arc Passport 🆔'}
        </button>
      </div>
    );
  }

  const currentLevel = level ? Number(level) : 1;
  const currentXP = xp ? Number(xp) : 0;
  const nextLevelXP = (currentLevel) * (currentLevel) * 100;
  const prevLevelXP = (currentLevel-1) * (currentLevel-1) * 100;

  const xpForCurrentLevel = currentXP - prevLevelXP;
  const xpToNextLevel = nextLevelXP - prevLevelXP;
  
  const badgeList = (badges as boolean[]) || [false, false, false];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
      {/* Left Card: Avatar & Progress */}
      <div className="md:col-span-1 bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 mb-4 flex items-center justify-center">
            <span className="text-6xl">🆔</span>
        </div>
        <h3 className="text-xl font-bold text-white">{address?.slice(0, 6)}...{address?.slice(-4)}</h3>
        <p className="text-slate-400">Arc Traveler</p>

        <div className="w-full mt-6">
            <div className="flex justify-between items-end mb-1">
                <span className="text-yellow-400 font-bold text-2xl">Level {currentLevel}</span>
                <span className="text-sm text-slate-500">{xpForCurrentLevel} / {xpToNextLevel} XP</span>
            </div>
            <ProgressBar value={xpForCurrentLevel} max={xpToNextLevel} />
        </div>
      </div>

      {/* Right Card: Badges */}
      <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Badges</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Badge name="Streamer" unlocked={badgeList[0]} icon="💸" />
            <Badge name="Linker" unlocked={badgeList[1]} icon="🔗" />
            <Badge name="Investor" unlocked={badgeList[2]} icon="🤖" />
          </div>
      </div>
    </div>
  );
}
