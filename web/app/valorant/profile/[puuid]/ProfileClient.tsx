'use client';

import { useState, useEffect } from 'react';
import { syncRecentMatches } from '@/actions/valorantSync';
import { getMatchDetails, toggleMatchOfficialStatus, getMatchPerformance } from '@/actions/valorantMatch';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { RefreshCw, ChevronLeft } from 'lucide-react';
import { TrackerScoreBadge } from '@/components/valorant/TrackerScoreBadge';
import { MatchCard } from './MatchCard';

export interface MatchInfo {
  id: string;
  isOfficial?: boolean;
  gameStartAt: string | Date;
  blueScore: number;
  redScore: number;
  mapId: string;
  isManualOverride?: boolean;
  overrideByUser?: { name: string } | null;
}

export interface MatchParticipation {
  id: string;
  isWin: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  characterId: string;
  match: MatchInfo;
  mmrDelta?: number | null;
  mmrSnapshot?: number | null;
  kast?: number | null;
  damageDeltaPerRound?: number;
  roundWinPercentage?: number;
  trackerScore?: number;
}

export interface ParticipantWithAccount {
  id: string;
  puuid: string;
  characterId: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  account: {
    gameName: string;
    tagLine: string;
    currentTier?: string | null;
  };
  matchTrackerScore?: number;
}

export interface FullMatchInfo extends MatchInfo {
  participants: ParticipantWithAccount[];
}

export interface MatchPerformance {
  matchTrackerScore: number;
  acs: number;
  kast: number;
  damageDelta: number;
  roundWinRate: number;
  percentiles: {
    acs: number;
    kast: number;
    damageDelta: number;
    roundWinRate: number;
    matchTrackerScore: number;
  };
}


interface ProfileClientProps {
  account: {
    puuid: string;
    gameName: string;
    tagLine: string;
    currentTier?: string | null;
    lastSyncRequestedAt?: string | Date | null;
    needsDeepSync?: boolean | null;
    isActive: boolean;
    cardImageUrl?: string | null;
  };
  participations: MatchParticipation[];
  internalTierInfo: {
    tier: string;
    mmr: number;
    matchCount: number;
    trackerScore?: number | null;
    topPercentage?: number | null;
    acsPercentile?: number | null;
    kastPercentile?: number | null;
    damageDeltaPercentile?: number | null;
    winRatePercentile?: number | null;
  } | null;
  connectedUser: { name: string } | null;
}

export default function ProfileClient({ account, participations, internalTierInfo, connectedUser }: ProfileClientProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'official'>('official');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchDetailsCache, setMatchDetailsCache] = useState<Record<string, FullMatchInfo>>({});

  const [matchPerformanceCache, setMatchPerformanceCache] = useState<Record<string, MatchPerformance>>({});

  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [agentMap, setAgentMap] = useState<Record<string, { icon: string, name: string }>>({});
  const [mapMap, setMapMap] = useState<Record<string, { name: string, icon: string }>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();


  const handleToggleOfficial = async (matchId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`이 매치를 내전${currentStatus ? '에서 제외' : '에 포함'}하시겠습니까?`)) {
      const res = await toggleMatchOfficialStatus(matchId, !currentStatus);
      if (!res.success) {
        alert(res.error);
      } else {
        router.refresh();
      }
    }
  };

  const handleMatchClick = async (matchId: string) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      return;
    }
    setExpandedMatchId(matchId);
    if (!matchDetailsCache[matchId]) {
      setIsLoadingMatch(true);
      const [detailsRes, performanceRes] = await Promise.all([
        getMatchDetails(matchId),
        getMatchPerformance(matchId, account.puuid)
      ]);
      
      if (detailsRes.success && detailsRes.data) {
        setMatchDetailsCache((prev) => ({ ...prev, [matchId]: detailsRes.data as unknown as FullMatchInfo }));
      }

      if (performanceRes.success && performanceRes.data) {
        setMatchPerformanceCache((prev) => ({ ...prev, [matchId]: performanceRes.data as MatchPerformance }));
      }

      setIsLoadingMatch(false);
    }
  };


  useEffect(() => {
    if (!account.lastSyncRequestedAt) return;
    
    const calculateCooldown = () => {
      const now = new Date();
      const lastSync = new Date(account.lastSyncRequestedAt as string | number | Date);
      const diffSecs = Math.floor((now.getTime() - lastSync.getTime()) / 1000);
      return Math.max(0, 180 - diffSecs);
    };

    setCooldown(calculateCooldown());
    const interval = setInterval(() => {
      setCooldown(calculateCooldown());
    }, 1000);

    return () => clearInterval(interval);
  }, [account.lastSyncRequestedAt]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('https://valorant-api.com/v1/agents?language=ko-KR&isPlayableCharacter=true');
        const json = await res.json();
        if (json.status === 200) {
          const mapping: Record<string, { icon: string, name: string }> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json.data.forEach((agent: any) => {
            mapping[agent.uuid] = {
              icon: agent.displayIconSmall,
              name: agent.displayName
            };
          });
          setAgentMap(mapping);
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }

      try {
        const res = await fetch('https://valorant-api.com/v1/maps?language=ko-KR');
        const json = await res.json();
        if (json.status === 200) {
          const mapping: Record<string, { name: string, icon: string }> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json.data.forEach((map: any) => {
            mapping[map.uuid] = {
              name: map.displayName,
              icon: map.displayIcon || map.listViewIcon || ''
            };
          });
          setMapMap(mapping);
        }
      } catch (err) {
        console.error('Failed to fetch maps:', err);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);


  const handleSync = async () => {
    setIsSyncing(true);
    const res = await syncRecentMatches(account.puuid);
    setIsSyncing(false);
    
    if (!res.success) {
      alert(res.error);
    } else {
      alert(res.message);
      router.refresh();
    }
  };

  // Calculate official stats (Limit to last 10 for averages)
  const allOfficialMatches = participations.filter((p) => p.match.isOfficial);
  const officialMatches = allOfficialMatches.slice(0, 10);
  // 요청된 5가지 지표 계산
  const avgAcs = officialMatches.length > 0 
    ? Math.round(officialMatches.reduce((acc, p) => acc + (p.score / Math.max(1, p.match.blueScore + p.match.redScore)), 0) / officialMatches.length) 
    : 0;
  
  const avgKast = officialMatches.length > 0
    ? (officialMatches.reduce((acc, p) => acc + (p.kast || 0), 0) / officialMatches.length).toFixed(1)
    : 0;
    
  const avgRoundWinRate = officialMatches.length > 0
    ? (officialMatches.reduce((acc, p) => acc + (p.roundWinPercentage || 0), 0) / officialMatches.length).toFixed(1)
    : 0;
    
  const avgDamageDelta = officialMatches.length > 0
    ? (officialMatches.reduce((acc, p) => acc + (p.damageDeltaPerRound || 0), 0) / officialMatches.length).toFixed(1)
    : 0;

  // 백분율 색상 및 포맷팅 헬퍼
  const renderPercentile = (percentile: number | null | undefined) => {
    if (percentile === null || percentile === undefined) return null;
    // 백분위는 높을수록 좋음 (클수록 100에 가까움) -> Top %는 (100 - percentile)
    const topP = Math.round((100 - percentile) * 10) / 10;
    const color = topP <= 50 ? 'text-emerald-400' : 'text-red-400';
    return (
      <div className={`text-[10px] font-bold mt-1 ${color}`}>
        Top {topP}%
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <Link 
        href="/valorant" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        내전 기록실로 돌아가기
      </Link>

      {/* Profile Header */}
      <div className="card flex flex-col md:flex-row items-center justify-between p-5 md:p-8 relative overflow-hidden group border-primary/20">
        {/* 배경 효과 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-700" />
        
        <div className="relative flex items-center gap-5 sm:gap-8 w-full">
          {/* 아바타 영역 (라이엇 카드 이미지) */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
            <div className="relative w-full h-full rounded-xl sm:rounded-3xl bg-secondary border border-border flex items-center justify-center shadow-inner overflow-hidden group/avatar">
              {account.cardImageUrl ? (
                <Image 
                  src={account.cardImageUrl} 
                  alt={`${account.gameName} Card`}
                  fill
                  className="object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                  unoptimized
                />
              ) : (
                <span className="text-2xl sm:text-4xl font-black text-foreground group-hover/avatar:scale-110 transition-transform duration-300">
                  {account.gameName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 text-left">
            <h1 className="text-2xl sm:text-4xl font-black flex flex-wrap items-center gap-x-2 text-foreground tracking-tighter mb-2 sm:mb-4">
              {account.gameName} 
              <span className="text-muted-foreground/40 text-lg sm:text-2xl font-bold tracking-normal">#{account.tagLine}</span>
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* 라이엇 티어 */}
              <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-secondary/50 rounded-lg border border-border">
                <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Riot</span>
                <span className="text-xs sm:text-sm font-bold text-foreground">{account.currentTier || 'Unranked'}</span>
              </div>

              {/* 연결된 사용자 */}
              {connectedUser && (
                <div className="flex items-center px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider">{connectedUser.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-0 flex flex-col items-center relative gap-3">
          <Button 
            onClick={handleSync} 
            disabled={isSyncing || cooldown > 0 || !account.isActive}
            className="btn-primary px-6 py-4 md:px-8 md:py-6 h-auto text-base md:text-lg w-full md:w-auto"
          >
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                갱신 중
              </div>
            ) : (cooldown > 0 ? `재시도 (${cooldown}초)` : (!account.isActive ? '갱신 비활성' : '전적 동기화'))}
          </Button>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {account.lastSyncRequestedAt 
              ? `최근 동기화: ${new Date(account.lastSyncRequestedAt).toLocaleString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}`
              : '동기화 기록 없음'}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {account.needsDeepSync && (
        <Alert className="bg-primary/5 border border-primary/20 text-foreground">
          <AlertTitle className="text-primary flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            동기화 진행 중
          </AlertTitle>
          <AlertDescription className="mt-2 text-muted-foreground text-sm">
            과거 전적이 너무 많아 서버에서 천천히 불러오는 중입니다. 잠시 후 다시 확인해 주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex bg-secondary p-1 rounded-xl border border-border w-fit">
        <button 
          onClick={() => setActiveTab('official')}
          className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'official' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
        >
          내전 기록
        </button>
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
        >
          전체 전적
        </button>
      </div>
      {/* Tab Content */}
      <div className="py-2">
        {activeTab === 'official' && (
          <div className="card overflow-hidden bg-secondary/30 border-border/50 shadow-md mb-6 p-0">
            <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/50">
              <div className="p-3 md:p-5 flex flex-row items-center justify-center gap-3 md:gap-4 bg-primary/5 hover:bg-primary/10 transition-colors col-span-2 md:col-span-1">
                <TrackerScoreBadge 
                  score={internalTierInfo?.trackerScore || 0} 
                  size="sm" 
                  className="scale-90 md:scale-100"
                />
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="text-muted-foreground text-xs md:text-sm mb-0.5 md:mb-1 font-medium">트래커 점수</div>
                  <div className="text-xl md:text-2xl font-bold text-foreground leading-none">{internalTierInfo?.trackerScore || 0}</div>
                  {internalTierInfo?.topPercentage != null && (
                    <div className="text-[9px] md:text-[10px] font-bold mt-1 text-emerald-400">Top {internalTierInfo.topPercentage}%</div>
                  )}
                </div>
              </div>

              <div className="p-3 md:p-5 text-center flex flex-col justify-center hover:bg-secondary/50 transition-colors">
                <div className="text-muted-foreground text-xs md:text-sm mb-0.5 md:mb-1 font-medium">라운드 승률</div>
                <div className="text-xl md:text-2xl font-bold text-blue-400">{avgRoundWinRate}%</div>
                {renderPercentile(internalTierInfo?.winRatePercentile)}
              </div>
              
              <div className="p-3 md:p-5 text-center flex flex-col justify-center hover:bg-secondary/50 transition-colors">
                <div className="text-muted-foreground text-xs md:text-sm mb-0.5 md:mb-1 font-medium">KAST</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{avgKast}%</div>
                {renderPercentile(internalTierInfo?.kastPercentile)}
              </div>

              <div className="p-3 md:p-5 text-center flex flex-col justify-center hover:bg-secondary/50 transition-colors">
                <div className="text-muted-foreground text-xs md:text-sm mb-0.5 md:mb-1 font-medium">ACS</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{avgAcs}</div>
                {renderPercentile(internalTierInfo?.acsPercentile)}
              </div>

              <div className="p-3 md:p-5 text-center flex flex-col justify-center hover:bg-secondary/50 transition-colors">
                <div className="text-muted-foreground text-xs md:text-sm mb-0.5 md:mb-1 font-medium">DDΔ/라운드</div>
                <div className="text-xl md:text-2xl font-bold text-emerald-400">{avgDamageDelta}</div>
                {renderPercentile(internalTierInfo?.damageDeltaPercentile)}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {(() => {
            let lastDateStr = '';
            const allMatchesToRender = activeTab === 'all' ? participations : allOfficialMatches;
            const matchesToRender = allMatchesToRender.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            
            if (allMatchesToRender.length === 0) {

              return (
                <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ghost mx-auto text-slate-600 mb-4"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
                  <div className="text-slate-400 text-lg font-medium">해당 전적이 없습니다.</div>
                </div>
              );
            }

            return matchesToRender.map((p) => {
              const gameStartAt = new Date(p.match.gameStartAt);
              const isCurrentYear = gameStartAt.getFullYear() === new Date().getFullYear();
              
              const matchDate = gameStartAt.toLocaleDateString('ko-KR', {
                year: isCurrentYear ? undefined : 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              });
              
              const showDateDivider = lastDateStr !== matchDate;
              lastDateStr = matchDate;
              
              return (
              <div key={p.id} className="space-y-4">
                {showDateDivider && (
                  <div className="flex items-center gap-2 md:gap-3 pt-6 md:pt-8 pb-3 first:pt-2">
                    <span className="text-base md:text-lg font-black text-slate-100 tracking-tighter">
                      {matchDate}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent opacity-40"></div>
                  </div>
                )}
                <MatchCard 
                  participation={p}
                  isExpanded={expandedMatchId === p.match.id}
                  onMatchClick={handleMatchClick}
                  onToggleOfficial={handleToggleOfficial}
                  agentMap={agentMap}
                  mapMap={mapMap}
                  matchDetails={matchDetailsCache[p.match.id]}
                  isLoadingMatch={isLoadingMatch}
                  matchPerformance={matchPerformanceCache[p.match.id]}
                  accountPuuid={account.puuid}
                />
              </div>
              );
            });
          })()}

          {/* Pagination Controls */}
          {(() => {
            const allMatchesToRender = activeTab === 'all' ? participations : allOfficialMatches;
            const totalPages = Math.ceil(allMatchesToRender.length / itemsPerPage);
            
            if (totalPages <= 1) return null;
            
            // Calculate slice of page numbers to show
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage + 1 < maxVisiblePages) {
              startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            return (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex items-center gap-1">
                  {/* Previous */}
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-secondary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(num => (
                    <button 
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all ${num === currentPage ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-secondary border border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      {num}
                    </button>
                  ))}
                  
                  {/* Next */}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-secondary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
