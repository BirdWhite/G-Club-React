'use client';

// Prisma 타입과 유사한 구조
export interface TeamSlotMember {
  id: string;
  name: string;
  tier: number;
  winningBid: number | null;
}

export interface TeamSlotGridProps {
  teams: {
    id: string;
    leaderName: string;
    initialPoints: number;
    currentPoints: number;
    members: TeamSlotMember[];
  }[];
  maxTeamSize: number;
  isTierMode: boolean;
}

export function TeamSlotGrid({ teams, maxTeamSize, isTierMode }: TeamSlotGridProps) {
  // 포인트 순으로 정렬 (또는 이름 순)
  const sortedTeams = [...teams].sort((a, b) => b.currentPoints - a.currentPoints);

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        팀 현황 보드
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedTeams.map((team) => (
          <div key={team.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-border/50">
              <div>
                <h4 className="font-extrabold text-lg">{team.leaderName} 팀</h4>
                <div className="text-sm text-muted-foreground mt-0.5">
                  멤버: <span className="font-bold text-foreground">{team.members.length} / {maxTeamSize}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-primary/10 text-primary font-black px-2.5 py-1 rounded-md mb-1 inline-block">
                  {team.currentPoints} P
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  초기: {team.initialPoints}
                </div>
              </div>
            </div>

            {/* 멤버 슬롯들 */}
            <div className="flex-1 flex flex-col gap-2">
              {Array.from({ length: maxTeamSize }).map((_, i) => {
                const member = team.members[i];
                if (member) {
                  return (
                    <div key={member.id} className="flex justify-between items-center bg-muted/60 rounded-md p-2.5 border border-border/50">
                      <div className="flex items-center gap-2">
                        {isTierMode && (
                          <span className="text-[10px] font-bold bg-background px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                            T{member.tier}
                          </span>
                        )}
                        <span className="font-bold text-sm">{member.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-primary/80">
                        {member.winningBid}P
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div key={`empty-${i}`} className="flex justify-between items-center bg-transparent border border-dashed border-border/60 rounded-md p-2.5 h-[42px] opacity-50">
                      <span className="text-xs font-medium text-muted-foreground">빈 자리</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
            저장된 팀이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
