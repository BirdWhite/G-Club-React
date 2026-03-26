import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { TrackerScoreBadge } from '@/components/valorant/TrackerScoreBadge';
import { MatchParticipation, FullMatchInfo, MatchPerformance } from './ProfileClient';

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
        className={`flex flex-col md:flex-row md:items-center p-3 md:p-4 border-l-4 cursor-pointer transition-colors ${p.isWin ? 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10' : 'border-l-red-500 bg-red-500/5 hover:bg-red-500/10'} ${isExpanded ? 'bg-secondary/50' : ''} gap-1.5 md:gap-6`}
      >
        {/* === [모바일 전용 상단 헤더: 메타 정보] === */}
        <div className="flex md:hidden justify-between items-center w-full mb-1">
          <div className="flex items-center gap-1.5">
            <div className={`text-xs font-black tracking-tighter ${p.isWin ? 'text-blue-400' : 'text-red-400'}`}>
              {p.isWin ? '승리' : '패배'}
            </div>
            <div className={`text-[8px] font-bold px-1 py-0.5 rounded border leading-none ${p.match.isOfficial ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-secondary/50 border-border text-muted-foreground'}`}>
              {p.match.isOfficial ? '내전' : '커스텀'}
            </div>
            <div className="text-[10px] font-black text-foreground/70 tracking-tight ml-0.5">
              {mapMap[p.match.mapId]?.name || 'Unknown Map'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {p.match.isOfficial && p.mmrDelta != null && (
              <div className={`text-[9px] font-black ${p.mmrDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {p.mmrDelta > 0 ? `+${p.mmrDelta}` : p.mmrDelta}
              </div>
            )}
            <div className="text-[9px] text-muted-foreground/50 font-medium">
              {new Date(p.match.gameStartAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* === [메인 전적 영역: 데스크탑 일렬 & 모바일 바디] === */}
        <div className="flex flex-row items-center justify-between md:justify-start w-full gap-2 md:gap-6">
          
          {/* 1. 데스크탑 승패/타입 (모바일 숨김) */}
          <div className="hidden md:flex flex-col items-center justify-center min-w-[70px]">
            <div className={`text-2xl font-black tracking-tighter ${p.isWin ? 'text-blue-400' : 'text-red-400'}`}>
              {p.isWin ? '승리' : '패배'}
            </div>
            <div className={`text-[10px] font-bold px-1.5 py-0.5 mt-0.5 rounded border leading-none ${p.match.isOfficial ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-secondary/50 border-border text-muted-foreground'}`}>
              {p.match.isOfficial ? '내전' : '커스텀'}
            </div>
          </div>

          {/* 요원 이미지 & 4. 트래커 합집합 (간격 축소) */}
          <div className="flex flex-row items-center gap-1 md:gap-2">
            {/* 2. 요원 이미지 (공용) */}
            <div className="w-10 h-10 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center bg-secondary rounded-full overflow-hidden border-2 border-border shadow-inner">
              {agentMap[p.characterId] ? (
                <Image src={agentMap[p.characterId].icon} alt={agentMap[p.characterId].name} width={56} height={56} className="object-cover scale-110" />
              ) : (
                <div className="text-[10px] font-bold text-muted-foreground">?</div>
              )}
            </div>

            {/* 4. 트래커 (공용) */}
            <div className="flex flex-col items-center justify-center gap-0.5 min-w-[40px] md:min-w-[60px]">
              <TrackerScoreBadge 
                score={p.trackerScore || 0} 
                size="sm" 
                className="scale-[0.7] md:scale-90 origin-center"
              />
              <span className="text-[10px] md:text-sm font-black text-foreground/80 leading-none">
                {p.trackerScore || 0}
              </span>
            </div>
          </div>

          {/* 데스크탑 전용 시간/맵 (모바일 숨김) */}
          <div className="hidden md:flex flex-col">
            <div className="text-xs text-muted-foreground/60 font-medium">
              {new Date(p.match.gameStartAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-base font-black text-foreground tracking-tight leading-tight">
              {mapMap[p.match.mapId]?.name || 'Unknown Map'}
            </div>
          </div>

          {/* 3. 스코어 (공용) */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 font-black text-base md:text-xl min-w-[45px] md:min-w-[80px] justify-center tracking-tighter">
              <span className="text-emerald-400">
                {Math.max(p.match.blueScore, p.match.redScore)}
              </span>
              <span className="text-muted-foreground/30 font-bold mx-0.5">:</span>
              <span className="text-red-400">
                {Math.min(p.match.blueScore, p.match.redScore)}
              </span>
            </div>
          </div>


          {/* 5. KDA & 통계 (모바일에서는 세로 배치) */}
          <div className="flex flex-col items-end justify-center min-w-[75px] md:min-w-[120px] md:ml-auto">
            <div className="font-black text-sm md:text-xl tracking-tight text-foreground whitespace-nowrap">
              {p.kills} <span className="text-muted-foreground/20 font-normal">/</span> <span className="text-red-400">{p.deaths}</span> <span className="text-muted-foreground/20 font-normal">/</span> {p.assists}
            </div>
            
            {/* ACS, MMR, 드롭다운 (데스크탑 일렬 / 모바일 KDA 하단) */}
            <div className="flex items-center gap-1.5 md:gap-3 mt-0.5 md:mt-1">
              <div className="text-[9px] md:text-[10px] text-muted-foreground font-bold bg-secondary/30 px-1 md:px-1.5 py-0.5 rounded-md border border-border/50">
                ACS <span className="text-foreground">{Math.round(p.score / Math.max(1, p.match.blueScore + p.match.redScore))}</span>
              </div>
              {/* 데스크탑 전용 MMR (모바일은 헤더로 이동) */}
              {p.match.isOfficial && p.mmrDelta != null && (
                <div className={`hidden md:block text-[10px] font-black px-1.5 py-0.5 rounded-full bg-secondary/50 border border-border/50 ${p.mmrDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.mmrDelta > 0 ? `+${p.mmrDelta}` : p.mmrDelta}
                </div>
              )}
              <div className={`text-muted-foreground/40 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expanded Match Details */}
      {isExpanded && (
        <div className="bg-secondary/30 p-3 md:p-5 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {isLoadingMatch && !matchDetails ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : matchDetails ? (
            <div className="space-y-4">
              {/* Match Performance Stats (Individual Summary) */}
              {matchPerformance && (
                <div className="card overflow-hidden bg-secondary/50 border-border/50 shadow-sm p-0">
                  <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/50">
                    <div className="p-3 md:p-4 flex flex-row items-center justify-center gap-2 md:gap-3 bg-primary/10 group/card hover:bg-primary/20 transition-colors col-span-2 md:col-span-1">
                      <TrackerScoreBadge 
                        score={matchPerformance.matchTrackerScore} 
                        size="sm" 
                        className="scale-75 md:scale-90"
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider">트래커 점수</div>
                        <div className="text-sm md:text-xl font-black text-foreground">{matchPerformance.matchTrackerScore}</div>
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
                    
                    {[
                      { label: '라운드 승률', val: `${matchPerformance.roundWinRate}%`, perc: matchPerformance.percentiles.roundWinRate, color: 'text-blue-400' },
                      { label: 'KAST', val: `${matchPerformance.kast}%`, perc: matchPerformance.percentiles.kast, color: 'text-foreground' },
                      { label: 'ACS', val: matchPerformance.acs, perc: matchPerformance.percentiles.acs, color: 'text-foreground' },
                      { label: 'DDΔ/라운드', val: matchPerformance.damageDelta, perc: matchPerformance.percentiles.damageDelta, color: 'text-emerald-400' }
                    ].map((stat, idx) => (
                      <div key={idx} className="p-2 md:p-4 text-center flex flex-col justify-center hover:bg-primary/5 transition-colors">
                        <div className="text-muted-foreground text-[8px] md:text-[10px] mb-0.5 md:mb-1 font-bold uppercase tracking-wider">{stat.label}</div>
                        <div className={`text-sm md:text-xl font-black ${stat.color}`}>{stat.val}</div>
                        {(() => {
                          const topP = Math.round((100 - stat.perc) * 10) / 10;
                          return (
                            <div className={`text-[8px] md:text-[10px] font-black mt-0.5 md:mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                              TOP {topP}%
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Score Display */}
              <div className="flex items-center justify-center gap-3 md:gap-4 text-base md:text-xl font-black bg-background/50 py-2 md:py-3 rounded-xl border border-border shadow-inner">
                <span className="text-blue-500 text-sm md:text-xl">BLUE {matchDetails.blueScore}</span>
                <span className="text-muted-foreground/30 font-bold mx-1 md:mx-2 text-xs md:text-base">VS</span>
                <span className="text-red-500 text-sm md:text-xl">{matchDetails.redScore} RED</span>
              </div>
              
              {/* Teams Comparison Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {['Blue', 'Red'].map((team) => (
                  <div key={team} className={`${team === 'Blue' ? 'bg-blue-950/20 border-blue-900/30' : 'bg-red-950/20 border-red-900/30'} border rounded-lg overflow-hidden`}>
                    <div className={`${team === 'Blue' ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'} py-2 px-3 border-b border-inherit`}>
                      <h3 className="font-bold text-xs tracking-widest text-center uppercase">{team === 'Blue' ? 'Blue Team' : 'Red Team'}</h3>
                    </div>
                    <div className="p-1.5 space-y-1">
                      {matchDetails.participants.filter((pt) => pt.team === team).map((pt) => (
                        <Link 
                          key={pt.id} 
                          href={`/valorant/profile/${pt.puuid}`}
                          className={`grid grid-cols-[32px_40px_1fr] md:grid-cols-[40px_40px_1fr_90px] items-center gap-1.5 md:gap-3 p-1.5 md:p-2 rounded transition-all ${pt.puuid === accountPuuid ? (team === 'Blue' ? 'bg-blue-500/20 border border-blue-500/40 shadow-sm' : 'bg-red-500/20 border border-red-500/40 shadow-sm') : 'hover:bg-background/40'}`}
                        >
                          {/* Agent Icon */}
                          <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center bg-background/50 rounded-md overflow-hidden border border-border/50">
                            {agentMap[pt.characterId] ? (
                              <Image src={agentMap[pt.characterId].icon} alt={agentMap[pt.characterId].name} width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-[10px] font-bold text-muted-foreground">?</div>
                            )}
                          </div>

                          {/* Tracker Score */}
                          <div className="flex flex-col items-center justify-center">
                            <TrackerScoreBadge score={pt.matchTrackerScore || 0} size="sm" className="scale-50 md:scale-75 origin-center" />
                            <span className="text-[8px] md:text-[9px] text-slate-400 font-bold -mt-2.5 md:-mt-2">{pt.matchTrackerScore || 0}</span>
                          </div>
                          
                          {/* Info Section (Name & Stats) */}
                          <div className="min-w-0 md:contents">
                            <div className="min-w-0 flex items-center justify-between md:contents">
                              <div className="min-w-0 overflow-hidden pr-2">
                                <div className="font-semibold text-xs text-foreground truncate">{pt.account.gameName}</div>
                                <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-tighter truncate">
                                  {agentMap[pt.characterId]?.name || 'Unknown'}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end justify-center md:min-w-[90px]">
                                <div className="text-xs md:text-sm font-medium text-foreground/80">{pt.kills}/{pt.deaths}/{pt.assists}</div>
                                <div className="text-[8px] md:text-xs text-muted-foreground whitespace-nowrap">ACS {Math.round(pt.score / Math.max(1, matchDetails.blueScore + matchDetails.redScore))}</div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Official Status Toggle Button */}
              <div className="mt-6 pt-4 border-t border-border/10">
                <button 
                  onClick={(e) => onToggleOfficial(p.match.id, !!p.match.isOfficial, e)}
                  className={`w-full py-3.5 md:py-4 rounded-xl font-black text-sm md:text-base transition-all shadow-sm flex items-center justify-center gap-2 md:gap-3 border ${p.match.isOfficial 
                    ? 'bg-card-elevated text-foreground hover:bg-card-elevated/80 border-border/50' 
                    : 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/40'}`}
                >
                  <RefreshCw size={18} strokeWidth={2.5} />
                  {p.match.isOfficial ? '이 매치를 커스텀으로 표시' : '이 매치를 내전으로 표시'}
                </button>
              </div>
            </div>

          ) : (
            <div className="text-center py-4 text-muted-foreground">상세 정보를 불러오지 못했습니다.</div>
          )}
        </div>
      )}
    </div>
  );
};
