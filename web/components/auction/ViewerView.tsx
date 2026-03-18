'use client';

import { ParticipantCard } from './ParticipantCard';
import { BidLog, BidLogItem } from './BidLog';
import { AuctionTimer } from './AuctionTimer';
import { TeamSlotGrid } from './TeamSlotGrid';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData, AuctionBidData } from '@/lib/auction/types';

interface ViewerViewProps {
  config: AuctionConfigData;
  currentParticipant: AuctionParticipantData | null;
  bids: AuctionBidData[];
  teams: AuctionTeamData[];
  endTimeMs: number | null;
  isExtension: boolean;
}

export function ViewerView({ config, currentParticipant, bids, teams, endTimeMs, isExtension }: ViewerViewProps) {
  // 포맷팅
  const bidLogs: BidLogItem[] = bids.map(b => ({
    id: b.id,
    teamName: b.team?.leaderName || '알 수 없음',
    amount: b.amount,
    time: new Date(b.createdAt).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })).reverse();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pt-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* 좌측: 매물 정보 (관전용) */}
        <div className="flex-1 space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">라이브 경매 중계</h2>
            <div className="px-4 py-2 bg-secondary/20 rounded-full border border-secondary flex gap-2">
              <span className="text-sm font-semibold tracking-widest uppercase text-secondary-foreground animate-pulse">
                Live Spectating
              </span>
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
            <div className="w-full h-[300px] border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground flex-col gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              <p className="font-medium text-lg">대기 중입니다...</p>
            </div>
          )}
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
