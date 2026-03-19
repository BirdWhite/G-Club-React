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
  const sortedTeams = [...teams].sort((a, b) => b.currentPoints - a.currentPoints);

  return (
    <div className="w-full">
      <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        팀 현황 보드
      </h3>
      
      <div className="w-full overflow-x-auto rounded-lg border border-border shadow-sm bg-card">
        <table className="w-full text-xs text-left table-auto">
          <thead className="bg-muted/50 text-muted-foreground text-[10px] font-bold border-b border-border">
            <tr>
              <th className="px-2 py-2 whitespace-nowrap font-extrabold">팀장</th>
              <th className="px-2 py-2 whitespace-nowrap text-center">포인트</th>
              {Array.from({ length: maxTeamSize - 1 }).map((_, i) => (
                <th key={i} className="px-2 py-2 whitespace-nowrap text-center border-l border-border/50">
                  {isTierMode ? `${i + 1}티어` : `팀원`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTeams.map((team) => (
              <tr key={team.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <div className="font-extrabold text-sm">{team.leaderName}</div>
                  <div className="text-[9px] text-muted-foreground">({team.members.length + 1}/{maxTeamSize}명)</div>
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                  <span className="font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{team.currentPoints}P</span>
                </td>
                {Array.from({ length: maxTeamSize - 1 }).map((_, i) => {
                  const member = team.members[i];
                  return (
                    <td key={i} className="px-2 py-1.5 border-l border-border/50 text-center">
                      {member ? (
                        <div className="flex items-center justify-center gap-2 bg-muted/40 px-2 py-1 rounded border border-border/50 mx-auto w-max max-w-full">
                          <div className="flex items-center gap-1 overflow-hidden">
                            {isTierMode && (
                              <span className="text-[9px] font-bold text-muted-foreground bg-background px-1 py-0.5 rounded border border-border shrink-0">
                                T{member.tier}
                              </span>
                            )}
                            <span className="font-bold truncate text-xs">{member.name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-primary/80 shrink-0">
                            {member.winningBid}P
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/30 font-medium">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={maxTeamSize + 1} className="px-2 py-4 text-center text-muted-foreground text-xs border-t border-dashed border-border">
                  저장된 팀이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
