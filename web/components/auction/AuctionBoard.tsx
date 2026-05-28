'use client';

import { useState } from 'react';
import { ParticipantCard } from './ParticipantCard';
import { ParticipantList } from './ParticipantList';
import { BidLog, BidLogItem } from './BidLog';
import { AuctionTimer } from './AuctionTimer';
import { TeamSlotGrid } from './TeamSlotGrid';
import { AdminControls } from './AdminControls';
import { WebSocketStatus } from './WebSocketStatus';
import { HighestBidDisplay } from './HighestBidDisplay';
import { ViewerControls } from './ViewerControls';
import { ErrorBoundary } from './ErrorBoundary';
import { placeBid } from '@/app/auction/actions';
import { toast } from 'react-hot-toast';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData, AuctionBidData } from '@/lib/auction/types';
import { Sparkles, Trophy, Users, Shield, Plus, Minus } from 'lucide-react';

interface AuctionBoardProps {
  auctionId: string;
  config: AuctionConfigData;
  currentParticipant: AuctionParticipantData | null;
  participants: AuctionParticipantData[];
  bids: AuctionBidData[];
  teams: AuctionTeamData[];
  endTimeMs: number | null;
  isExtension: boolean;
  isLeader: boolean;
  isAdmin: boolean;
  team?: AuctionTeamData | null;
}

export function AuctionBoard({ 
  auctionId, 
  config, 
  currentParticipant, 
  participants, 
  bids, 
  teams, 
  endTimeMs, 
  isExtension, 
  isLeader, 
  isAdmin,
  team 
}: AuctionBoardProps) {
  const [customBidAmount, setCustomBidAmount] = useState<number | ''>('');
  const [isBidding, setIsBidding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. 권한 매핑 규칙 반영
  // [중요 권한 매핑 규칙]: 관리자이면서 팀장인 경우, 팀장(CAPTAIN) 권한을 우선 부여하고 관리자 기능은 숨김.
  const activeRole = isLeader ? 'CAPTAIN' : isAdmin ? 'ADMIN' : 'VIEWER';

  // 최고가 입찰 로직
  const highestBid = bids.length > 0 ? bids[0] : null;
  const currentHighestBid = highestBid ? highestBid.amount : 0;
  const isCurrentHighestBidder = highestBid !== null && team !== undefined && team !== null && highestBid.teamId === team.id;
  const minRequiredBid = currentHighestBid + config.minBidIncrement;

  // 파산 방지 상한선 계산
  const remainingSlots = team ? (config.maxTeamSize - 1) - team.members.length : 0;
  const slotsToKeep = Math.max(0, remainingSlots - 1);
  const maxAllowedBid = team ? team.currentPoints - (slotsToKeep * config.minBidIncrement) : 0;

  const canBid = activeRole === 'CAPTAIN' && team && currentParticipant && currentParticipant.status === 'BIDDING' && endTimeMs !== null && remainingSlots > 0 && maxAllowedBid >= minRequiredBid && !config.isPaused && !isCurrentHighestBidder;

  // 경매 진행률 계산
  const totalParticipants = participants.length;
  const completedParticipants = participants.filter(p => p.status === 'SOLD' || p.status === 'PASSED').length;
  const progressPercentage = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0;

  // 입찰 버튼 핸들러
  const handleBid = async (amount: number) => {
    setErrorMsg(null);
    if (!team || activeRole !== 'CAPTAIN') return;

    if (amount > maxAllowedBid) {
      setErrorMsg(`파산 방지! 최대 ${maxAllowedBid} 포인트까지만 입찰 가능합니다.`);
      return;
    }
    if (amount < minRequiredBid) {
      setErrorMsg(`최소 ${minRequiredBid} 포인트 이상 입찰해야 합니다.`);
      return;
    }
    if (!currentParticipant) return;

    setIsBidding(true);
    const res = await placeBid(auctionId, team.id, currentParticipant.id, amount);
    setIsBidding(false);

    if (res.success) {
      toast.success(`${amount.toLocaleString()} 포인트 입찰!`);
      setCustomBidAmount('');
    } else {
      setErrorMsg(res.error || '입찰 실패');
      toast.error(res.error || '입찰 실패');
    }
  };

  // 퀵 입찰 증액 핸들러
  const handleQuickIncrement = (inc: number) => {
    setErrorMsg(null);
    setCustomBidAmount(prev => {
      const base = typeof prev === 'number' ? prev : minRequiredBid;
      return base + inc;
    });
  };

  // 포맷팅
  const bidLogs: BidLogItem[] = bids.map(b => ({
    id: b.id,
    teamName: b.team?.leaderName || '알 수 없음',
    amount: b.amount,
    time: new Date(b.createdAt).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })).reverse();

  return (
    <ErrorBoundary>
      <div className="w-full h-full flex flex-col bg-zinc-950 text-white p-4 gap-4 overflow-hidden font-sans">
        
        {/* ====================================================================== */}
        {/* [Global Header] 거대한 중앙 타이머 및 경매 진행률                       */}
        {/* ====================================================================== */}
        <header className="shrink-0 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
          {/* Background glowing grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.03)_0%,transparent_50%)] pointer-events-none" />

          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-white truncate max-w-[200px]">
                {config.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <WebSocketStatus />
              </div>
            </div>
          </div>

          {/* Center Giant Timer & Progress Bar */}
          <div className="flex flex-col items-center justify-center flex-1 max-w-xl w-full px-4">
            <div className="w-full max-w-[260px] md:max-w-[320px]">
              <AuctionTimer 
                endTimeMs={endTimeMs} 
                isExtension={isExtension} 
                isPaused={config.isPaused}
                remainingTimerMs={config.remainingTimerMs}
              />
            </div>
            {/* Linear Progress Bar */}
            <div className="w-full mt-3">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold mb-1 tracking-wide">
                <span>경매 완료 매물: {completedParticipants} / {totalParticipants}</span>
                <span className="text-primary font-black">{progressPercentage.toFixed(1)}% 완료</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-zinc-700/30">
                <div 
                  className="bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Role Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80 text-right">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Access Role</div>
              <div className="text-sm font-black text-white mt-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span>
                  {activeRole === 'ADMIN' ? '시스템 관리자' : activeRole === 'CAPTAIN' ? '팀장 (입찰자)' : '실시간 시청자'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ====================================================================== */}
        {/* [3단 분할 레이아웃] Left-Center-Right                                   */}
        {/* ====================================================================== */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

          {/* 1. Left Column (팀 현황 보드, 전체 매물 리스트) */}
          <section className="col-span-12 xl:col-span-3 flex flex-col gap-4 min-h-0">
            {/* 팀 현황 보드 */}
            <div className="flex-[4] min-h-[180px] bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col overflow-hidden shadow-lg">
              <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                <TeamSlotGrid teams={teams} maxTeamSize={config.maxTeamSize} isTierMode={config.isTierMode} />
              </div>
            </div>
            {/* 전체 매물 리스트 */}
            <div className="flex-[6] min-h-[220px] bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col overflow-hidden shadow-lg">
              <ParticipantList 
                participants={participants} 
                currentParticipantId={currentParticipant?.id} 
                isTierMode={config.isTierMode} 
                className="flex-1 min-h-0 border-0 bg-transparent p-0"
              />
            </div>
          </section>

          {/* 2. Center Column (현재 매물 상세 정보, 최고 입찰 정보, 조작 패널) */}
          <section className="col-span-12 xl:col-span-6 flex flex-col gap-4 min-h-0">
            {/* 현재 매물 상세 정보 */}
            <div className="flex-1 min-h-0 bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex flex-col overflow-hidden shadow-lg">
              <div className="flex items-center justify-between shrink-0 mb-3 border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-extrabold text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  진행 중인 경매 매물 정보
                </h3>
                {currentParticipant && (
                  <span className="text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                    BIDDING NOW
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {currentParticipant ? (
                  <ParticipantCard 
                    name={currentParticipant.name}
                    tier={currentParticipant.tier}
                    gameRank={currentParticipant.gameRank}
                    prefCharacters={currentParticipant.prefCharacters}
                    bio={currentParticipant.bio}
                    isTierMode={config.isTierMode}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 py-12 border-2 border-dashed border-zinc-800/80 rounded-xl">
                    <Trophy className="w-12 h-12 stroke-[1.2] opacity-40 mb-3" />
                    <p className="font-semibold text-sm">진행 중인 경매가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 정중앙: 현재 최고 입찰 정보 */}
            <div className="shrink-0">
              <HighestBidDisplay highestBid={highestBid} minBidIncrement={config.minBidIncrement} />
            </div>

            {/* Center Bottom: 각 페이지별 전용 조작 패널 */}
            <div className="shrink-0 z-10">
              
              {/* [ADMIN] 관리자 전용 제어 패널 */}
              {activeRole === 'ADMIN' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-2">
                  <AdminControls 
                    config={config} 
                    participants={participants} 
                    bidsCount={bids.length}
                  />
                </div>
              )}

              {/* [CAPTAIN] 팀장 전용 입찰 조작 패널 */}
              {activeRole === 'CAPTAIN' && team && (
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary font-black">
                        {team.leaderName[0]}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white">{team.leaderName} 팀장 패널</h4>
                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                          남은 인원 수: <span className="text-primary font-black">{remainingSlots}명</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-zinc-950/80 px-3.5 py-1.5 rounded-xl border border-zinc-800/80">
                      <span className="text-xs font-bold text-zinc-400">보유 포인트:</span>
                      <span className="text-sm font-black text-primary">{team.currentPoints.toLocaleString()}P</span>
                    </div>

                    <div className="text-xs font-bold text-zinc-400">
                      입찰 상한액: <span className="text-rose-500 font-black">{maxAllowedBid.toLocaleString()} P</span>
                    </div>
                  </div>

                  {/* 입찰 금액 폼 및 퀵 버튼 */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder={`${minRequiredBid} P`}
                        className="flex-1 bg-zinc-950 border-2 border-zinc-800 rounded-xl px-4 py-2 font-black text-xl text-center text-white placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                        value={customBidAmount === '' ? '' : customBidAmount}
                        onChange={(e) => {
                          setCustomBidAmount(Number(e.target.value) || '');
                          setErrorMsg(null);
                        }}
                        disabled={!canBid || isBidding}
                      />
                      <button
                        onClick={() => {
                          if (customBidAmount === '') {
                            handleBid(minRequiredBid);
                          } else if (typeof customBidAmount === 'number') {
                            handleBid(customBidAmount);
                          }
                        }}
                        disabled={!canBid || isBidding}
                        className={`w-1/3 font-black text-base rounded-xl transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${isCurrentHighestBidder ? 'bg-amber-500 text-white shadow-amber-500/10' : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-primary/10'}`}
                      >
                        {isCurrentHighestBidder ? '최고 입찰중' : '입찰 참여'}
                      </button>
                    </div>

                    {/* Quick bid buttons */}
                    <div className="flex gap-2 justify-stretch items-center">
                      <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mr-2 shrink-0">Quick Bid</span>
                      {[10, 50, 100].map(inc => (
                        <button
                          key={inc}
                          onClick={() => handleQuickIncrement(inc)}
                          disabled={!canBid || isBidding}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-extrabold text-xs py-1.5 px-3 rounded-lg border border-zinc-700/50 cursor-pointer transition-colors"
                        >
                          +{inc}P
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setErrorMsg(null);
                          setCustomBidAmount(maxAllowedBid);
                        }}
                        disabled={!canBid || isBidding}
                        className="flex-1 bg-rose-950/40 hover:bg-rose-900/40 disabled:opacity-50 text-rose-400 font-extrabold text-xs py-1.5 px-3 rounded-lg border border-rose-800/40 cursor-pointer transition-colors"
                      >
                        MAX ({maxAllowedBid}P)
                      </button>
                    </div>

                    {errorMsg && (
                      <div className="text-red-400 font-bold text-xs bg-red-950/40 px-3 py-2 rounded-xl border border-red-800/40 flex items-center gap-1.5 animate-in slide-in-from-top-1">
                        ⚠️ {errorMsg}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* [VIEWER] 시청자 전용 패널 */}
              {activeRole === 'VIEWER' && (
                <ViewerControls />
              )}

            </div>
          </section>

          {/* 3. Right Column (실시간 입찰 로그 타임라인) */}
          <section className="col-span-12 xl:col-span-3 flex flex-col gap-4 min-h-0 bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 shadow-lg overflow-hidden">
            <BidLog logs={bidLogs} />
          </section>

        </div>
      </div>
    </ErrorBoundary>
  );
}
