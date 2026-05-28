'use client';

import { Eye, ShieldAlert, Sparkles } from 'lucide-react';

export function ViewerControls() {
  return (
    <div className="relative overflow-hidden w-full rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Glow animation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="flex items-center gap-3.5 z-10">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Eye className="w-5.5 h-5.5 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-sm text-white">실시간 경매 중계 시청 중</h4>
            <span className="text-[10px] font-extrabold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Spectator Mode
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-semibold mt-1">
            입찰 내역 및 타이머는 실시간으로 동기화됩니다. 입찰은 각 팀장님들만 가능합니다.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-zinc-400 font-bold text-xs shrink-0 select-none z-10">
        <ShieldAlert className="w-4 h-4 text-zinc-500" />
        <span>제어 권한 없음 (일반 시청자)</span>
      </div>
    </div>
  );
}
