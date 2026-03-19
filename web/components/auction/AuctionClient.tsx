'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';
import { AuctionBoard } from './AuctionBoard';

import { useRouter } from 'next/navigation';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData, AuctionBidData } from '@/lib/auction/types';

export interface AuctionClientProps {
  initialConfig: AuctionConfigData;
  initialTeams: AuctionTeamData[];
  initialParticipant: AuctionParticipantData | null;
  initialParticipants: AuctionParticipantData[];
  initialBids: AuctionBidData[];
  isAdmin: boolean;
  isLeader: boolean;
  userTeamId?: string; // LEADER인 경우
}

export function AuctionClient({ 
  initialConfig, 
  initialTeams, 
  initialParticipant, 
  initialParticipants,
  initialBids, 
  isAdmin, 
  isLeader, 
  userTeamId 
}: AuctionClientProps) {
  const router = useRouter();
  
  // 상태 관리 (props 기반 동기화)
  const [config, setConfig] = useState(initialConfig);
  const [teams, setTeams] = useState(initialTeams);
  const [bids, setBids] = useState(initialBids);

  // 타이머 상태 (서버 제공 timerEndsAt 기반)
  const [endTimeMs, setEndTimeMs] = useState<number | null>(() => {
    if (!initialConfig?.isActive || !initialParticipant) return null;
    return initialConfig.timerEndsAt ? new Date(initialConfig.timerEndsAt).getTime() : null;
  });

  const [isExtension, setIsExtension] = useState(initialBids.length > 0);

  // 서버(Next.js)에서 router.refresh()로 새 props를 받았을 때 상태를 정확히 동기화
  useEffect(() => {
    setConfig(initialConfig);
    setTeams(initialTeams);
    setBids(initialBids);

    if (initialConfig?.isActive && initialParticipant) {
      setEndTimeMs(initialConfig.timerEndsAt ? new Date(initialConfig.timerEndsAt).getTime() : null);
    } else {
      setEndTimeMs(null);
    }
    
    setIsExtension(initialBids.length > 0);
  }, [initialConfig, initialTeams, initialParticipant, initialBids]);

  // 이벤트 핸들러
  const handleRealtimeEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    console.log('[AUCTION EVENT]', event, payload);
    const now = Date.now();

    switch (event) {
      case 'BID_PLACED':
        // 낙관적 업데이트
        setBids(prev => [payload as unknown as AuctionBidData, ...prev]);
        setEndTimeMs(now + (config.extensionTimer * 1000));
        setIsExtension(true);
        // DB 최신화 및 서버 타이머를 가져오기 위해 갱신
        router.refresh();
        break;

      case 'SALE_CONFIRMED':
      case 'PARTICIPANT_PASSED':
      case 'ACTION_UNDONE':
      case 'PARTICIPANT_ADVANCED':
      case 'AUCTION_RESET':
      case 'AUCTION_TOGGLED':
      case 'AUCTION_TOGGLED_PAUSE':
      case 'PARTICIPANTS_SHUFFLED':
      case 'TIMER_RESET':
        router.refresh();
        break;
    }
  }, [config.extensionTimer, router]);

  useAuctionRealtime(config?.id, handleRealtimeEvent);

  if (!config || !config.isActive) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl font-black text-muted-foreground opacity-50">경매가 준비 중입니다.</h1>
        <p className="text-lg text-muted-foreground">관리자가 경매를 시작하면 자동으로 화면이 갱신됩니다.</p>
        
        {isAdmin && (
          <button onClick={() => router.push('/auction/admin')} className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold">
            관리자 대시보드로 이동
          </button>
        )}
      </div>
    );
  }

  const leaderTeam = isLeader ? teams.find(t => t.id === userTeamId) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="flex-1 min-h-0">
        <AuctionBoard 
          auctionId={config.id}
          team={leaderTeam}
          config={config}
          currentParticipant={initialParticipant}
          participants={initialParticipants}
          bids={bids}
          teams={teams}
          endTimeMs={endTimeMs}
          isExtension={isExtension}
          isLeader={isLeader}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
