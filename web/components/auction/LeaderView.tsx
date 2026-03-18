'use client';

import { useState } from 'react';
import { ParticipantCard } from './ParticipantCard';
import { BidLog, BidLogItem } from './BidLog';
import { AuctionTimer } from './AuctionTimer';
import { TeamSlotGrid } from './TeamSlotGrid';
import { placeBid } from '@/app/auction/actions';
import { toast } from 'react-hot-toast';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData, AuctionBidData } from '@/lib/auction/types';

interface LeaderViewProps {
  auctionId: string;
  team: AuctionTeamData;
  config: AuctionConfigData;
  currentParticipant: AuctionParticipantData | null;
  bids: AuctionBidData[];
  teams: AuctionTeamData[];
  endTimeMs: number | null;
  isExtension: boolean;
}

export function LeaderView({ auctionId, team, config, currentParticipant, bids, teams, endTimeMs, isExtension }: LeaderViewProps) {
  const [customBidAmount, setCustomBidAmount] = useState<number | ''>('');
  const [isBidding, setIsBidding] = useState(false);

  // 최고가 입찰 로직
  const currentHighestBid = bids.length > 0 ? bids[0].amount : 0;
  const minRequiredBid = currentHighestBid + config.minBidIncrement;

  // 파산 방지 상한선 계산
  const remainingSlots = config.maxTeamSize - team.members.length;
  // 단, 이번에 입찰하는 자리(1자리)를 제외한 나머지 빈 자리 유지비용
  const slotsToKeep = Math.max(0, remainingSlots - 1);
  const maxAllowedBid = team.currentPoints - (slotsToKeep * config.minBidIncrement);

  const canBid = currentParticipant && currentParticipant.status === 'BIDDING' && endTimeMs !== null && remainingSlots > 0 && maxAllowedBid >= minRequiredBid;

  // 입찰 버튼 핸들러
  const handleBid = async (amount: number) => {
    if (amount > maxAllowedBid) {
      toast.error(`파산 방지! 최대 ${maxAllowedBid} 포인트까지만 입찰 가능합니다.`);
      return;
    }
    if (amount < minRequiredBid) {
      toast.error(`최소 ${minRequiredBid} 포인트 이상 입찰해야 합니다.`);
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
    <div className="w-full max-w-7xl mx-auto space-y-6 pt-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* 좌측: 매물 정보 및 입찰 제어 */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">{team.leaderName} 팀장 대시보드</h2>
            <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20 flex gap-4">
              <span className="text-sm font-semibold">보유 포인트: <span className="text-primary font-black text-lg">{team.currentPoints}</span></span>
              <span className="text-sm font-semibold">남은 슬롯: <span className="text-primary font-black text-lg">{remainingSlots}</span></span>
            </div>
          </div>

          <AuctionTimer endTimeMs={endTimeMs} isExtension={isExtension} />

          {currentParticipant ? (
            <ParticipantCard 
              name={currentParticipant.name}
              tier={currentParticipant.tier}
              gameRank={currentParticipant.gameRank}
              prefCharacters={currentParticipant.prefCharacters}
              bio={currentParticipant.bio}
            />
          ) : (
            <div className="w-full h-48 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground">
              진행 중인 경매가 없습니다.
            </div>
          )}

          {/* 입찰 컨트롤 판넬 */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-md space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">입찰하기</h3>
              <p className="text-sm text-muted-foreground font-semibold">
                최대 입찰 가능 (파산 방지): <span className="text-red-500">{maxAllowedBid} P</span>
              </p>
            </div>

            <div className="flex gap-4 items-stretch">
              <button
                onClick={() => handleBid(minRequiredBid)}
                disabled={!canBid || isBidding}
                className="flex-1 bg-primary text-primary-foreground font-black text-lg py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {minRequiredBid} P 입찰 (최소금액)
              </button>
              
              <div className="flex-1 flex gap-2">
                <input
                  type="number"
                  placeholder="직접 입력"
                  className="flex-1 border-2 border-border rounded-xl px-4 font-bold text-lg text-center"
                  value={customBidAmount}
                  onChange={(e) => setCustomBidAmount(Number(e.target.value) || '')}
                  disabled={!canBid || isBidding}
                />
                <button
                  onClick={() => typeof customBidAmount === 'number' && handleBid(customBidAmount)}
                  disabled={!canBid || isBidding || customBidAmount === ''}
                  className="w-1/3 bg-zinc-800 text-white font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                >
                  제출
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 로그 영역 */}
        <div className="w-full lg:w-[400px]">
          <BidLog logs={bidLogs} />
        </div>
      </div>

      {/* 하단: 전체 상황판 */}
      <div className="pt-8 border-t border-border">
        <TeamSlotGrid teams={teams} maxTeamSize={config.maxTeamSize} isTierMode={config.isTierMode} />
      </div>
    </div>
  );
}
