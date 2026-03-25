import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { TrackerScoreBadge } from '@/components/valorant/TrackerScoreBadge';
import { MatchParticipation, FullMatchInfo, MatchPerformance, ParticipantWithAccount } from './ProfileClient';

interface MatchCardProps {
  participation: MatchParticipation;
  isExpanded: boolean;
  onMatchClick: (matchId: string) => Promise<void>;
  onToggleOfficial: (matchId: string, currentStatus: boolean, e: React.MouseEvent) => Promise<void>;
  agentMap: Record<string, { icon: string; name: string }>;
  mapMap: Record<string, { name: string; icon: string }>;
  matchDetails: FullMatchInfo | null;
  isLoadingMatch: boolean;
  matchPerformance: MatchPerformance | null;
  accountPuuid: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  participation: p,
  isExpanded,
  onMatchClick,
  onToggleOfficial,
  agentMap,
  mapMap,
  matchDetails,
  isLoadingMatch,
  matchPerformance,
  accountPuuid,
}) => {
  return (
    <div className="card flex flex-col overflow-hidden border-border/50 shadow hover:shadow-primary/10 transition-shadow">
      <div 
        onClick={() => onMatchClick(p.match.id)}
        className={`flex flex-col md:flex-row p-3 md:p-5 border-l-4 cursor-pointer transition-colors ${p.isWin ? 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10' : 'border-l-red-500 bg-red-500/5 hover:bg-red-500/10'} ${isExpanded ? 'bg-secondary/50' : ''}`}
      >
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] md:text-sm font-bold px-1.5 md:px-2 py-0.5 rounded ${p.isWin ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
              {p.isWin ? '승리' : '패배'}
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-secondary rounded-full overflow-hidden border-2 border-border shadow-inner">
                {agentMap[p.characterId] ? (
                  <Image src={agentMap[p.characterId].icon} alt={agentMap[p.characterId].name} width={48} height={48} className="object-cover" />
                ) : (
                  <div className="text-[10px] font-bold text-muted-foreground">?</div>
                )}
              </div>
              <div>
                <div className="font-bold text-base md:text-xl text-foreground">
                  {agentMap[p.characterId]?.name || 'Unknown'}
                </div>
              </div>
            </div>
            {p.match.isManualOverride && p.match.overrideByUser && (
              <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                {p.match.overrideByUser.name}님이 수동으로 변경함
              </div>
            )}
          </div>
          <div className="text-muted-foreground text-[10px] md:text-sm mt-2 md:mt-3 flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="flex items-center gap-1 md:gap-1.5 font-medium text-foreground bg-secondary px-1.5 md:px-2 py-0.5 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map md:w-[14px] md:h-[14px]"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>
              {mapMap[p.match.mapId]?.name || 'Unknown Map'}
            </div>
            <div className="font-bold text-foreground tracking-wider text-xs md:text-base">
              {p.match.blueScore} : {p.match.redScore}
            </div>
            <div className="flex items-center gap-1 md:gap-1.5 text-muted-foreground/60">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days md:w-[14px] md:h-[14px]"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
              {new Date(p.match.gameStartAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div className="flex md:items-center gap-3 md:gap-5 mt-4 md:mt-0">
          <div className="flex flex-col items-start md:items-end justify-center flex-1">
            <div className="font-extrabold text-xl md:text-2xl tracking-tight text-foreground mb-1 md:mb-2 text-nowrap">
              {p.kills} <span className="text-muted-foreground/40 font-normal mx-0.5 md:mx-1">/</span> <span className="text-red-400">{p.deaths}</span> <span className="text-muted-foreground/40 font-normal mx-0.5 md:mx-1">/</span> {p.assists}
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <button 
                onClick={(e) => onToggleOfficial(p.match.id, !!p.match.isOfficial, e)}
                className={`text-[9px] md:text-[10px] font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded transition-all border ${p.match.isOfficial ? 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20' : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'}`}
              >
                {p.match.isOfficial ? '내전' : '커스텀'}
              </button>
              <div className="text-muted-foreground text-[10px] md:text-sm font-medium bg-secondary/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-border">
                ACS: <span className="text-foreground">{Math.round(p.score / Math.max(1, p.match.blueScore + p.match.redScore))}</span>
              </div>
              {p.match.isOfficial && p.mmrDelta != null && (
                <div className="text-muted-foreground text-[10px] md:text-sm font-medium bg-secondary/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-border flex items-center gap-1 md:gap-1.5">
                  MMR: <span className={p.mmrDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {p.mmrDelta > 0 ? `+${p.mmrDelta}` : p.mmrDelta}
                  </span>
                  <span className="text-[9px] md:text-xs text-muted-foreground/60 mx-1">→</span>
                  <span className="text-primary font-bold">{p.mmrSnapshot}</span>
                </div>
              )}
            </div>
          </div>
          <div className={`text-muted-foreground/40 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'group-hover:text-muted-foreground'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
      
      {/* Dropdown Content */}
      {isExpanded && (
        <div className="bg-secondary/30 p-5 border-t border-border">
          {isLoadingMatch && !matchDetails ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : matchDetails ? (
            <div className="space-y-4">
              {/* Match Performance Stats (Individual) */}
              {matchPerformance && (
                <div className="card overflow-hidden bg-secondary/50 border-border/50 shadow-sm mb-4 p-0">
                  <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/50">
                    <div className="p-3 md:p-4 flex flex-row items-center justify-center gap-2 md:gap-3 bg-primary/10 group/card hover:bg-primary/20 transition-colors col-span-2 md:col-span-1">
                      <TrackerScoreBadge 
                        score={matchPerformance.matchTrackerScore} 
                        size="sm" 
                        className="scale-75 md:scale-90"
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider">트래커 점수</div>
                        <div className="text-sm md:text-xl font-black text-foreground group-hover/card:scale-105 transition-transform">{matchPerformance.matchTrackerScore}</div>
                        {matchPerformance.percentiles.matchTrackerScore != null && (() => {
                          const topP = Math.round((100 - matchPerformance.percentiles.matchTrackerScore) * 10) / 10;
                          return (
                            <div className={`text-[8px] md:text-[10px] font-black mt-0.5 md:mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                              TOP {topP}%
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="p-2 md:p-4 text-center flex flex-col justify-center hover:bg-primary/5 transition-colors">
                      <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider">라운드 승률</div>
                      <div className="text-sm md:text-xl font-black text-blue-400">{matchPerformance.roundWinRate}%</div>
                      {(() => {
                        const topP = Math.round((100 - matchPerformance.percentiles.roundWinRate) * 10) / 10;
                        return (
                          <div className={`text-[8px] md:text-[10px] font-black mt-0.5 md:mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                            TOP {topP}%
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-2 md:p-4 text-center flex flex-col justify-center hover:bg-primary/5 transition-colors">
                      <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider">KAST</div>
                      <div className="text-sm md:text-xl font-black text-foreground">{matchPerformance.kast}%</div>
                      {(() => {
                        const topP = Math.round((100 - matchPerformance.percentiles.kast) * 10) / 10;
                        return (
                          <div className={`text-[8px] md:text-[10px] font-black mt-0.5 md:mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                            TOP {topP}%
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-2 md:p-4 text-center flex flex-col justify-center hover:bg-primary/5 transition-colors">
                      <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider">ACS</div>
                      <div className="text-sm md:text-xl font-black text-foreground">{matchPerformance.acs}</div>
                      {(() => {
                        const topP = Math.round((100 - matchPerformance.percentiles.acs) * 10) / 10;
                        return (
                          <div className={`text-[8px] md:text-[10px] font-black mt-0.5 md:mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                            TOP {topP}%
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-2 md:p-4 text-center flex flex-col justify-center hover:bg-primary/5 transition-colors">
                      <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider text-wrap">DDΔ/라운드</div>
                      <div className="text-sm md:text-xl font-black text-emerald-400">{matchPerformance.damageDelta}</div>
                      {(() => {
                        const topP = Math.round((100 - matchPerformance.percentiles.damageDelta) * 10) / 10;
                        return (
                          <div className={`text-[8px] md:text-[10px] font-black mt-0.5 md:mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                            TOP {topP}%
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Match Score */}
              <div className="flex items-center justify-center gap-3 md:gap-4 text-base md:text-xl font-black bg-background py-2 md:py-3 rounded-xl border border-border shadow-inner">
                <span className="text-blue-500 text-sm md:text-xl">BLUE {matchDetails.blueScore}</span>
                <span className="text-muted-foreground/40 font-bold mx-1 md:mx-2 text-xs md:text-base">VS</span>
                <span className="text-red-500 text-sm md:text-xl">{matchDetails.redScore} RED</span>
              </div>
              
              {/* Participants Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Blue Team */}
                <div className="bg-blue-950/30 border border-blue-900/40 rounded-lg overflow-hidden">
                  <div className="bg-blue-900/50 py-2 px-3 border-b border-blue-900/40">
                    <h3 className="text-blue-400 font-bold text-sm tracking-widest text-center">BLUE TEAM</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    {matchDetails.participants.filter((pt: ParticipantWithAccount) => pt.team === 'Blue').map((pt: ParticipantWithAccount) => (
                      <Link 
                        key={pt.id} 
                        href={`/valorant/profile/${pt.puuid}`}
                        className={`grid grid-cols-[32px_32px_1fr_auto] md:grid-cols-[40px_40px_1fr_90px] items-center gap-1.5 md:gap-3 p-1.5 md:p-2 rounded transition-colors ${pt.puuid === accountPuuid ? 'bg-blue-800/60 border border-blue-500/50 shadow-sm' : 'hover:bg-slate-800/50'}`}
                      >
                        {/* Tracker Score Badge */}
                        <div className="flex flex-col items-center justify-center">
                          <TrackerScoreBadge 
                            score={pt.matchTrackerScore || 0} 
                            size="sm" 
                            className="scale-50 md:scale-75 origin-center" 
                          />
                          <span className="text-[8px] md:text-[9px] text-slate-400 font-bold mt-[-10px] md:mt-[-8px]">
                            {pt.matchTrackerScore || 0}
                          </span>
                        </div>

                        {/* Agent Icon */}
                        <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center bg-slate-800 rounded-md overflow-hidden border border-slate-700/50">
                          {agentMap[pt.characterId] ? (
                            <Image src={agentMap[pt.characterId].icon} alt={agentMap[pt.characterId].name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] font-bold text-slate-500">AGENT</div>
                          )}
                        </div>
                        
                        {/* Name Section */}
                        <div className="min-w-0 overflow-hidden">
                          <div className="font-semibold text-xs md:text-sm text-white truncate">{pt.account.gameName}</div>
                          <div className="text-[8px] md:text-[10px] text-slate-500 uppercase tracking-tighter truncate">
                            {agentMap[pt.characterId]?.name || 'Unknown'}
                          </div>
                        </div>

                        {/* KDA / ACS */}
                        <div className="text-right min-w-[60px] md:min-w-[90px]">
                          <div className="text-xs md:text-sm font-medium text-slate-300">
                            {pt.kills}/{pt.deaths}/{pt.assists}
                          </div>
                          <div className="text-[8px] md:text-xs text-slate-500 whitespace-nowrap">ACS: {Math.round(pt.score / Math.max(1, matchDetails.blueScore + matchDetails.redScore))}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Red Team */}
                <div className="bg-red-950/30 border border-red-900/40 rounded-lg overflow-hidden">
                  <div className="bg-red-900/50 py-2 px-3 border-b border-red-900/40">
                    <h3 className="text-red-400 font-bold text-sm tracking-widest text-center">RED TEAM</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    {matchDetails.participants.filter((pt: ParticipantWithAccount) => pt.team === 'Red').map((pt: ParticipantWithAccount) => (
                      <Link 
                        key={pt.id} 
                        href={`/valorant/profile/${pt.puuid}`}
                        className={`grid grid-cols-[32px_32px_1fr_auto] md:grid-cols-[40px_40px_1fr_90px] items-center gap-1.5 md:gap-3 p-1.5 md:p-2 rounded transition-colors ${pt.puuid === accountPuuid ? 'bg-red-800/60 border border-red-500/50 shadow-sm' : 'hover:bg-slate-800/50'}`}
                      >
                        {/* Tracker Score Badge */}
                        <div className="flex flex-col items-center justify-center">
                          <TrackerScoreBadge 
                            score={pt.matchTrackerScore || 0} 
                            size="sm" 
                            className="scale-50 md:scale-75 origin-center" 
                          />
                          <span className="text-[8px] md:text-[9px] text-slate-400 font-bold mt-[-10px] md:mt-[-8px]">
                            {pt.matchTrackerScore || 0}
                          </span>
                        </div>

                        {/* Agent Icon */}
                        <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center bg-slate-800 rounded-md overflow-hidden border border-slate-700/50">
                          {agentMap[pt.characterId] ? (
                            <Image src={agentMap[pt.characterId].icon} alt={agentMap[pt.characterId].name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] font-bold text-slate-500">AGENT</div>
                          )}
                        </div>
                        
                        {/* Name Section */}
                        <div className="min-w-0 overflow-hidden">
                          <div className="font-semibold text-xs md:text-sm text-white truncate">{pt.account.gameName}</div>
                          <div className="text-[8px] md:text-[10px] text-slate-500 uppercase tracking-tighter truncate">
                            {agentMap[pt.characterId]?.name || 'Unknown'}
                          </div>
                        </div>

                        {/* KDA / ACS */}
                        <div className="text-right min-w-[60px] md:min-w-[90px]">
                          <div className="text-xs md:text-sm font-medium text-slate-300">
                            {pt.kills}/{pt.deaths}/{pt.assists}
                          </div>
                          <div className="text-[8px] md:text-xs text-slate-500 whitespace-nowrap">ACS: {Math.round(pt.score / Math.max(1, matchDetails.blueScore + matchDetails.redScore))}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">상세 정보를 불러오지 못했습니다.</div>
          )}
        </div>
      )}
    </div>
  );
};
