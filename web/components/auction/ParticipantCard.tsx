'use client';

interface ParticipantCardProps {
  name: string;
  tier: number;
  gameRank: string | null;
  prefCharacters: string | null;
  bio: string | null;
  isTierMode: boolean;
}

export function ParticipantCard({ name, tier, gameRank, prefCharacters, bio, isTierMode }: ParticipantCardProps) {
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col rounded-xl border-2 border-primary/20 bg-card overflow-hidden shadow-lg">
      <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight">{name}</h2>
          <div className="flex items-center gap-2 mt-2">
            {isTierMode && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono 
                ${tier === 1 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500' :
                  tier === 2 ? 'bg-slate-400/20 text-slate-600 dark:text-slate-400' :
                  tier === 3 ? 'bg-amber-700/20 text-amber-800 dark:text-amber-600' :
                  'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                T{tier} 티어
              </span>
            )}
            {gameRank && (
              <span className="text-sm font-semibold text-muted-foreground px-2 border-l-2 border-border">
                {gameRank}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div>
          <h3 className="text-sm font-bold text-primary/70 uppercase tracking-wider mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            모스트 챔피언 / 선호 캐릭터
          </h3>
          <p className="text-lg font-bold">
            {prefCharacters || '미기재'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-primary/70 uppercase tracking-wider mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            참가 각오 / 자기소개
          </h3>
          <div className="bg-muted/50 rounded-lg p-4 border border-border h-full min-h-[100px]">
            <p className="text-lg leading-relaxed italic text-foreground/90">
              &ldquo;{bio || '각오가 작성되지 않았습니다.'}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
