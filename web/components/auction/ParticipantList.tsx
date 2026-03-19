'use client';

import { AuctionParticipantData } from '@/lib/auction/types';

interface ParticipantListProps {
  participants: AuctionParticipantData[];
  currentParticipantId?: string | null;
  isTierMode: boolean;
  className?: string;
}

export function ParticipantList({ participants, currentParticipantId, isTierMode, className }: ParticipantListProps) {
  const sortedParticipants = [...participants].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      'BIDDING': 1,
      'WAITING': 2,
      'PASSED': 3,
      'SOLD': 4
    };
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    
    return a.orderIndex - b.orderIndex;
  });

  return (
    <div className={`bg-card border border-border rounded-xl p-4 flex flex-col ${className || 'h-[400px]'}`}>
      <h3 className="font-bold mb-3 text-lg flex-shrink-0 flex items-center justify-between">
        <span>전체 매물 리스트</span>
        <span className="text-sm font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{participants.length}명</span>
      </h3>
      <div className="overflow-y-auto pr-2 flex-1 space-y-2 custom-scrollbar">
        {sortedParticipants.map(p => (
          <div 
            key={p.id} 
            className={`p-3 rounded-lg border text-sm flex justify-between items-center transition-colors ${
              p.id === currentParticipantId 
                ? 'bg-primary/10 border-primary shadow-sm' 
                : p.status === 'SOLD'
                ? 'bg-muted/30 border-border opacity-50'
                : 'bg-background border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.id === currentParticipantId ? 'bg-primary animate-pulse' : p.status === 'SOLD' ? 'bg-zinc-500' : 'bg-transparent'}`}></span>
              <span className={`font-bold truncate max-w-[100px] ${p.id === currentParticipantId ? 'text-primary' : ''}`}>{p.name}</span>
            </div>
            <div className="flex gap-2 items-center flex-shrink-0">
              {isTierMode && (
                <span className={`px-1.5 py-0.5 rounded font-mono text-xs font-bold ${
                  p.tier === 1 ? 'bg-yellow-500/10 text-yellow-600' :
                  p.tier === 2 ? 'bg-slate-400/10 text-slate-600' :
                  p.tier === 3 ? 'bg-amber-700/10 text-amber-600' :
                  'bg-zinc-500/10 text-zinc-500'
                }`}>T{p.tier}</span>
              )}
              {p.gameRank && <span className="opacity-70 text-[10px] truncate max-w-[60px] ml-1">{p.gameRank}</span>}
              <span className={`w-16 text-center px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider ml-1 ${
                p.status === 'SOLD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                p.status === 'BIDDING' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' : 
                'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
