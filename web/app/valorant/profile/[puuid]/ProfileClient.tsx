'use client';

import { useState, useEffect } from 'react';
import { syncRecentMatches } from '@/actions/valorantSync';
import { getMatchDetails, toggleMatchOfficialStatus, getMatchPerformance } from '@/actions/valorantMatch';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

interface MatchInfo {
  id: string;
  isOfficial?: boolean;
  gameStartAt: string | Date;
  blueScore: number;
  redScore: number;
  mapId: string;
  isManualOverride?: boolean;
  overrideByUser?: { name: string } | null;
}

interface MatchParticipation {
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
}

interface ParticipantWithAccount {
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
}

interface FullMatchInfo extends MatchInfo {
  participants: ParticipantWithAccount[];
}

interface MatchPerformance {
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
}

export default function ProfileClient({ account, participations, internalTierInfo }: ProfileClientProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'official'>('all');
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

  // Calculate official stats
  const officialMatches = participations.filter((p) => p.match.isOfficial);
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

  // 내전 티어 라벨 설정
  const getInternalTierLabel = (tier: string) => {
    if (tier === 'unplaced') return { label: '배치 중', color: 'text-slate-400' };
    return { 
      label: `Tier ${tier}`, 
      color: tier === '0' ? 'text-yellow-400' : tier === '1' ? 'text-red-400' : tier === '2' ? 'text-emerald-400' : 'text-indigo-400'
    };
  };

  const internalTier = internalTierInfo ? getInternalTierLabel(internalTierInfo.tier) : null;

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
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden group">
        {/* 배경 효과 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-indigo-600/10 transition-colors duration-700" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* 아바타 영역 (이니셜 가상 아바타) */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center shadow-inner relative group/avatar">
            <span className="text-4xl font-black text-white group-hover/avatar:scale-110 transition-transform duration-300">
              {account.gameName.charAt(0).toUpperCase()}
            </span>
            {account.isActive && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg">
                <span className="text-[10px] font-black text-white">ON</span>
              </div>
            )}
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black flex flex-wrap items-center justify-center md:justify-start gap-2 text-white tracking-tighter">
              {account.gameName} 
              <span className="text-slate-600 text-2xl font-bold tracking-normal">#{account.tagLine}</span>
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
              {/* 라이엇 티어 */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Riot Rank</span>
                <span className="text-sm font-bold text-slate-200">{account.currentTier || 'Unranked'}</span>
              </div>

              {/* 내전 티어 (G-Club) */}
              {internalTierInfo && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Internal Rank</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-black ${internalTier?.color}`}>{internalTier?.label}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span className="text-sm font-bold text-white">{internalTierInfo.mmr} MMR</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-0 flex flex-col items-center relative gap-3">
          <Button 
            onClick={handleSync} 
            disabled={isSyncing || cooldown > 0 || !account.isActive}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-6 h-auto text-lg rounded-2xl shadow-xl shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                갱신 중
              </div>
            ) : (cooldown > 0 ? `재시도 (${cooldown}초)` : (!account.isActive ? '갱신 비활성' : '전적 동기화'))}
          </Button>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Henrik API v4</p>
        </div>
      </div>

      {/* Alert Banner */}
      {account.needsDeepSync && (
        <Alert className="bg-amber-950/40 border border-amber-800 text-amber-200">
          <AlertTitle className="text-amber-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
            동기화 진행 중
          </AlertTitle>
          <AlertDescription className="mt-2 text-amber-300">
            과거 전적이 너무 많아 서버에서 천천히 불러오는 중입니다. 잠시 후 다시 확인해 주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('all')}
          className={`py-3 px-6 text-sm font-medium transition-colors border-b-2 ${activeTab === 'all' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          전체 커스텀 게임
        </button>
        <button 
          onClick={() => setActiveTab('official')}
          className={`py-3 px-6 text-sm font-medium transition-colors border-b-2 ${activeTab === 'official' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          내전
        </button>
      </div>

      {/* Tab Content */}
      <div className="py-2">
        {activeTab === 'official' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-center shadow-md hover:bg-indigo-500/10 transition-colors">
              <div className="text-indigo-400 text-sm mb-1 font-medium">트래커 스코어</div>
              <div className="text-2xl font-bold text-white">{internalTierInfo?.trackerScore || 0}</div>
              {internalTierInfo?.topPercentage != null && (
                <div className="text-[10px] font-black text-indigo-500 mt-1 uppercase">Top {internalTierInfo.topPercentage}%</div>
              )}
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl text-center shadow-md hover:bg-slate-900 transition-colors">
              <div className="text-slate-400 text-sm mb-1 font-medium">라운드 승률</div>
              <div className="text-2xl font-bold text-blue-400">{avgRoundWinRate}%</div>
              {renderPercentile(internalTierInfo?.winRatePercentile)}
            </div>
            
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl text-center shadow-md hover:bg-slate-900 transition-colors">
              <div className="text-slate-400 text-sm mb-1 font-medium">KAST</div>
              <div className="text-2xl font-bold text-white">{avgKast}%</div>
              {renderPercentile(internalTierInfo?.kastPercentile)}
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl text-center shadow-md hover:bg-slate-900 transition-colors">
              <div className="text-slate-400 text-sm mb-1 font-medium">ACS</div>
              <div className="text-2xl font-bold text-white">{avgAcs}</div>
              {renderPercentile(internalTierInfo?.acsPercentile)}
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl text-center shadow-md hover:bg-slate-900 transition-colors">
              <div className="text-slate-400 text-sm mb-1 font-medium">DD 델타/라운드</div>
              <div className="text-2xl font-bold text-emerald-400">{avgDamageDelta}</div>
              {renderPercentile(internalTierInfo?.damageDeltaPercentile)}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {(() => {
            let lastDateStr = '';
            const allMatchesToRender = activeTab === 'all' ? participations : officialMatches;
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
              const isExpanded = expandedMatchId === p.match.id;
              const matchDetails = matchDetailsCache[p.match.id];
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
                  <div className="flex items-center gap-3 pt-8 pb-3 first:pt-2">
                    <span className="text-lg font-black text-slate-100 tracking-tighter">
                      {matchDate}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent opacity-40"></div>
                  </div>
                )}
                <div className="flex flex-col rounded-xl overflow-hidden border border-slate-800/50 shadow hover:shadow-indigo-500/10 transition-shadow">
                  <div 
                    onClick={() => handleMatchClick(p.match.id)}
                    className={`flex flex-col md:flex-row p-5 border-l-4 cursor-pointer transition-colors ${p.isWin ? 'border-l-blue-500 bg-blue-950/10 hover:bg-blue-950/30' : 'border-l-red-500 bg-red-950/10 hover:bg-red-950/30'} ${isExpanded ? 'bg-slate-800/30' : ''}`}
                  >
                     <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-3">
                         <span className={`text-sm font-bold px-2 py-0.5 rounded ${p.isWin ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                           {p.isWin ? '승리' : '패배'}
                         </span>
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 shadow-inner">
                             {agentMap[p.characterId] ? (
                               <Image src={agentMap[p.characterId].icon} alt={agentMap[p.characterId].name} width={48} height={48} className="object-cover" />
                             ) : (
                               <div className="text-[10px] font-bold text-slate-500">?</div>
                             )}
                           </div>
                           <div>
                             <div className="font-bold text-xl text-white">
                               {agentMap[p.characterId]?.name || 'Unknown'}
                             </div>
                           </div>
                         </div>
                         {p.match.isManualOverride && p.match.overrideByUser && (
                           <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800 px-2 py-0.5 rounded flex items-center gap-1 ml-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                             {p.match.overrideByUser.name}님이 수동으로 변경함
                           </div>
                         )}
                       </div>
                      <div className="text-slate-400 text-sm mt-3 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>
                           {mapMap[p.match.mapId]?.name || 'Unknown Map'}
                        </div>
                        <div className="font-bold text-slate-200 tracking-wider">
                          {p.match.blueScore} : {p.match.redScore}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                          {new Date(p.match.gameStartAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="flex flex-col items-end justify-center">
                        <div className="font-extrabold text-2xl tracking-tight text-white mb-2">
                          {p.kills} <span className="text-slate-600 font-normal mx-1">/</span> <span className="text-red-400">{p.deaths}</span> <span className="text-slate-600 font-normal mx-1">/</span> {p.assists}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleToggleOfficial(p.match.id, !!p.match.isOfficial, e)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all border ${p.match.isOfficial ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:bg-slate-800'}`}
                          >
                            {p.match.isOfficial ? '내전' : '커스텀'}
                          </button>
                          <div className="text-slate-400 text-sm font-medium bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                            ACS: <span className="text-white">{Math.round(p.score / Math.max(1, p.match.blueScore + p.match.redScore))}</span>
                          </div>
                          {p.match.isOfficial && p.mmrDelta != null && (
                            <div className="text-slate-400 text-sm font-medium bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5">
                              MMR: <span className={p.mmrDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {p.mmrDelta > 0 ? `+${p.mmrDelta}` : p.mmrDelta}
                              </span>
                              <span className="text-xs text-slate-500 mx-1">→</span>
                              <span className="text-indigo-400 font-bold">{p.mmrSnapshot}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : 'group-hover:text-slate-300'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dropdown Content */}
                  {isExpanded && (
                    <div className="bg-slate-900 p-5 border-t border-slate-800">
                      {isLoadingMatch && !matchDetails ? (
                        <div className="flex justify-center py-8 text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                        </div>
                      ) : matchDetails ? (
                        <div className="space-y-4">
                          {/* Match Performance Stats (Individual) */}
                          {matchPerformanceCache[p.match.id] && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-2">
                              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center shadow-sm group/card hover:bg-indigo-500/20 transition-colors">
                                <div className="text-indigo-400 text-[10px] mb-1 font-bold uppercase tracking-wider opacity-70">매치 트래커 스코어</div>
                                <div className="text-2xl font-black text-white group-hover/card:scale-110 transition-transform">{matchPerformanceCache[p.match.id].matchTrackerScore}</div>
                              </div>
                              
                              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-center shadow-sm hover:border-slate-700 transition-colors">
                                <div className="text-slate-500 text-[10px] mb-1 font-bold uppercase tracking-wider">라운드 승률</div>
                                <div className="text-xl font-black text-blue-400">{matchPerformanceCache[p.match.id].roundWinRate}%</div>
                                {(() => {
                                  const topP = Math.round((100 - matchPerformanceCache[p.match.id].percentiles.roundWinRate) * 10) / 10;
                                  return (
                                    <div className={`text-[10px] font-black mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      TOP {topP}%
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-center shadow-sm hover:border-slate-700 transition-colors">
                                <div className="text-slate-500 text-[10px] mb-1 font-bold uppercase tracking-wider">KAST</div>
                                <div className="text-xl font-black text-white">{matchPerformanceCache[p.match.id].kast}%</div>
                                {(() => {
                                  const topP = Math.round((100 - matchPerformanceCache[p.match.id].percentiles.kast) * 10) / 10;
                                  return (
                                    <div className={`text-[10px] font-black mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      TOP {topP}%
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-center shadow-sm hover:border-slate-700 transition-colors">
                                <div className="text-slate-500 text-[10px] mb-1 font-bold uppercase tracking-wider">ACS</div>
                                <div className="text-xl font-black text-white">{matchPerformanceCache[p.match.id].acs}</div>
                                {(() => {
                                  const topP = Math.round((100 - matchPerformanceCache[p.match.id].percentiles.acs) * 10) / 10;
                                  return (
                                    <div className={`text-[10px] font-black mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      TOP {topP}%
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-center shadow-sm hover:border-slate-700 transition-colors">
                                <div className="text-slate-500 text-[10px] mb-1 font-bold uppercase tracking-wider text-wrap">DD 델타</div>
                                <div className="text-xl font-black text-emerald-400">{matchPerformanceCache[p.match.id].damageDelta}</div>
                                {(() => {
                                  const topP = Math.round((100 - matchPerformanceCache[p.match.id].percentiles.damageDelta) * 10) / 10;
                                  return (
                                    <div className={`text-[10px] font-black mt-1 ${topP <= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      TOP {topP}%
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Match Score */}
                          <div className="flex items-center justify-center gap-4 text-xl font-black bg-slate-950 py-3 rounded-xl border border-slate-800 shadow-inner">

                            <span className="text-blue-500">BLUE {matchDetails.blueScore}</span>
                            <span className="text-slate-500">VS</span>
                            <span className="text-red-500">{matchDetails.redScore} RED</span>
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
                                    className={`flex items-center justify-between p-2 rounded transition-colors ${pt.puuid === account.puuid ? 'bg-blue-800/60 border border-blue-500/50 shadow-sm' : 'hover:bg-slate-800/50'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-md overflow-hidden border border-slate-700/50">
                                        {agentMap[pt.characterId] ? (
                                          <Image src={agentMap[pt.characterId].icon} alt={agentMap[pt.characterId].name} width={40} height={40} />
                                        ) : (
                                          <div className="text-[10px] font-bold text-slate-500">AGENT</div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-sm text-white">{pt.account.gameName}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                          {agentMap[pt.characterId]?.name || 'Unknown'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-slate-300">
                                        {pt.kills}/{pt.deaths}/{pt.assists}
                                      </div>
                                      <div className="text-xs text-slate-500">ACS: {Math.round(pt.score / Math.max(1, matchDetails.blueScore + matchDetails.redScore))}</div>
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
                                    className={`flex items-center justify-between p-2 rounded transition-colors ${pt.puuid === account.puuid ? 'bg-red-800/60 border border-blue-500/50 shadow-sm' : 'hover:bg-slate-800/50'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-md overflow-hidden border border-slate-700/50">
                                        {agentMap[pt.characterId] ? (
                                          <Image src={agentMap[pt.characterId].icon} alt={agentMap[pt.characterId].name} width={40} height={40} />
                                        ) : (
                                          <div className="text-[10px] font-bold text-slate-500">AGENT</div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-sm text-white">{pt.account.gameName}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                          {agentMap[pt.characterId]?.name || 'Unknown'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-slate-300">
                                        {pt.kills}/{pt.deaths}/{pt.assists}
                                      </div>
                                      <div className="text-xs text-slate-500">ACS: {Math.round(pt.score / Math.max(1, matchDetails.blueScore + matchDetails.redScore))}</div>
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
              </div>
              );
            });
          })()}

          {/* Pagination Controls */}
          {(() => {
            const allMatchesToRender = activeTab === 'all' ? participations : officialMatches;
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
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(num => (
                    <button 
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all ${num === currentPage ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                    >
                      {num}
                    </button>
                  ))}
                  
                  {/* Next */}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
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
