'use client';

import { Trophy, ArrowUpCircle } from 'lucide-react';
import { AuctionBidData } from '@/lib/auction/types';

interface HighestBidDisplayProps {
  highestBid: AuctionBidData | null;
  minBidIncrement: number;
}

export function HighestBidDisplay({ highestBid, minBidIncrement }: HighestBidDisplayProps) {
  return (
    <div className="relative overflow-hidden w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-900/40 p-6 shadow-xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-2 w-full">
        <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-amber-500 text-xs font-extrabold tracking-widest uppercase">
          <Trophy className="w-3.5 h-3.5 animate-bounce" />
          <span>현재 최고 입찰 정보</span>
        </div>

        {highestBid ? (
          <div className="mt-3 flex flex-col items-center">
            {/* Bid Amount with pulsing gold glow */}
            <div className="relative">
              <span className="text-6xl md:text-7xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse select-none">
                {highestBid.amount.toLocaleString()}
                <span className="text-2xl md:text-3xl font-extrabold ml-1">P</span>
              </span>
            </div>

            {/* Bidder info */}
            <div className="mt-3 flex items-center gap-2 text-zinc-100">
              <span className="text-sm font-semibold text-zinc-400">입찰자:</span>
              <span className="text-lg font-black text-white bg-zinc-800/80 px-4 py-1 rounded-full border border-zinc-700/60 shadow-sm max-w-[200px] truncate">
                {highestBid.team?.leaderName || '알 수 없음'}
              </span>
            </div>
            
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-500/80 font-bold">
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>다음 최소 입찰가: {(highestBid.amount + minBidIncrement).toLocaleString()} P</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 py-3 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black font-mono text-zinc-600 dark:text-zinc-500">
              0<span className="text-xl font-extrabold ml-1">P</span>
            </span>
            <p className="text-sm text-zinc-400 font-semibold mt-2">
              아직 입찰자가 없습니다. 첫 입찰을 진행해 주세요!
            </p>
            <div className="mt-4 text-xs text-zinc-500 font-bold border border-zinc-800/60 px-3 py-1 rounded-full bg-zinc-900/40">
              최소 입찰가: {minBidIncrement.toLocaleString()} P
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
