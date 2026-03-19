'use client';

import { useState } from 'react';
import { ParticipantCard } from './ParticipantCard';
import { ParticipantList } from './ParticipantList';
import { BidLog, BidLogItem } from './BidLog';
import { AuctionTimer } from './AuctionTimer';
import { TeamSlotGrid } from './TeamSlotGrid';
import { AdminControls } from './AdminControls';
import { placeBid } from '@/app/auction/actions';
import { toast } from 'react-hot-toast';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData, AuctionBidData } from '@/lib/auction/types';

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

  // 최고가 입찰 로직
  const currentHighestBid = bids.length > 0 ? bids[0].amount : 0;
  const isCurrentHighestBidder = bids.length > 0 && team && bids[0].teamId === team.id;
  const minRequiredBid = currentHighestBid + config.minBidIncrement;

  // 파산 방지 상한선 계산 (maxTeamSize에는 팀장이 포함되어 있으므로, 실제 뽑아야 할 인원은 maxTeamSize - 1)
  const remainingSlots = team ? (config.maxTeamSize - 1) - team.members.length : 0;
  // 단, 이번에 입찰하는 자리(1자리)를 제외한 나머지 빈 자리 유지비용
  const slotsToKeep = Math.max(0, remainingSlots - 1);
  const maxAllowedBid = team ? team.currentPoints - (slotsToKeep * config.minBidIncrement) : 0;

  const canBid = isLeader && team && currentParticipant && currentParticipant.status === 'BIDDING' && endTimeMs !== null && remainingSlots > 0 && maxAllowedBid >= minRequiredBid && !config.isPaused && !isCurrentHighestBidder;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 입찰 버튼 핸들러
  const handleBid = async (amount: number) => {
    setErrorMsg(null);
    if (!team || !isLeader) return;

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
      toast.success(`${amount} 포인트 입찰!`);
      setCustomBidAmount('');
    } else {
      setErrorMsg(res.error || '입찰 실패');
      toast.error(res.error || '입찰 실패');
    }
  };

  // 포맷팅
  const bidLogs: BidLogItem[] = bids.map(b => ({
    id: b.id,
    teamName: b.team?.leaderName || '알 수 없음',
    amount: b.amount,
    time: new Date(b.createdAt).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })).reverse(); // 최신순에서 시간순으로 정렬(BidLog에서 아래로 스크롤)

  return (
    <div className="w-full h-full flex flex-row gap-4 min-h-0 overflow-x-auto">
      
      {/* 1열: 좌측 매물 전체 리스트 */}
      <div className="w-[240px] lg:w-[20%] shrink-0 flex flex-col min-h-0 px-2 overflow-y-auto custom-scrollbar">
        <ParticipantList 
          participants={participants} 
          currentParticipantId={currentParticipant?.id} 
          isTierMode={config.isTierMode} 
          className="flex-1 min-h-0"
        />
      </div>

      {/* 2열: 중앙 매물 상세 정보, 타이머, 입찰 폼 */}
      <div className="flex-1 flex flex-col gap-4 min-w-[400px] min-h-0 overflow-y-auto custom-scrollbar px-2">
        
        {/* 관리자 패널을 중앙 단의 최상단에 배치 */}
        {isAdmin && (
          <div className="shrink-0 w-full">
            <AdminControls 
              config={config} 
              participants={participants} 
              bidsCount={bids.length}
            />
          </div>
        )}

        <div className="flex items-center justify-between shrink-0 mb-1">
          <h2 className="text-xl font-black">
            라이브 경매 중계
          </h2>
          {(!isLeader || !team) && (
            <div className="px-3 py-1.5 bg-secondary/20 border border-secondary rounded-full flex gap-3 shrink-0">
              <span className="text-xs font-semibold tracking-widest uppercase text-secondary-foreground animate-pulse">
                Live Spectating
              </span>
            </div>
          )}
        </div>

        <AuctionTimer 
          endTimeMs={endTimeMs} 
          isExtension={isExtension} 
          isPaused={config.isPaused}
          remainingTimerMs={config.remainingTimerMs}
        />

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
          <div className="w-full flex-1 min-h-[200px] border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground flex-col gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            <p className="font-medium text-lg">진행 중인 경매가 없습니다.</p>
          </div>
        )}

        {/* 입찰 컨트롤 판넬 (팀장일 때만 표시) */}
        {isLeader && team && (
          <div className="bg-card p-4 rounded-xl border border-border shadow-md space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-lg">{team.leaderName}</h3>
                <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full flex gap-3">
                  <span className="text-sm font-semibold whitespace-nowrap">보유: <span className="text-primary font-black">{team.currentPoints}P</span></span>
                  <span className="text-sm font-semibold whitespace-nowrap">남은 팀원 자리: <span className="text-primary font-black">{remainingSlots}</span></span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-semibold">
                최대: <span className="text-red-500">{maxAllowedBid} P</span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3 items-stretch">
                <input
                  type="number"
                  placeholder={`${minRequiredBid} P`}
                  className="flex-1 border-2 border-border rounded-xl px-4 py-2 font-black text-xl text-center placeholder:opacity-50"
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
                  className={`w-2/5 font-black text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg ${isCurrentHighestBidder ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                >
                  {isCurrentHighestBidder ? '최고 입찰중' : '입찰'}
                </button>
              </div>
              {errorMsg && (
                <div className="text-red-500 font-bold text-sm bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3열: 우측 팀 현황 및 입찰 로그 영역 */}
      <div className="w-full xl:w-[30%] shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar px-2">
        <TeamSlotGrid teams={teams} maxTeamSize={config.maxTeamSize} isTierMode={config.isTierMode} />
        <BidLog logs={bidLogs} />
      </div>

    </div>
  );
}
