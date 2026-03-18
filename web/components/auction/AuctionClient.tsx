'use client';

import { useState, useCallback } from 'react';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';
import { LeaderView } from './LeaderView';
import { ViewerView } from './ViewerView';
import { useRouter } from 'next/navigation';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData, AuctionBidData } from '@/lib/auction/types';

export interface AuctionClientProps {
  initialConfig: AuctionConfigData;
  initialTeams: AuctionTeamData[];
  initialParticipant: AuctionParticipantData | null;
  initialBids: AuctionBidData[];
  role: 'ADMIN' | 'LEADER' | 'VIEWER';
  userTeamId?: string; // LEADER인 경우
}

export function AuctionClient({ 
  initialConfig, 
  initialTeams, 
  initialParticipant, 
  initialBids, 
  role, 
  userTeamId 
}: AuctionClientProps) {
  const router = useRouter();
  
  // 상태 관리
  const [config] = useState(initialConfig);
  const [teams] = useState(initialTeams);
  const [, setCurrentParticipant] = useState(initialParticipant);
  const [bids, setBids] = useState(initialBids);
  
  // 타이머 상태 (로컬시계 기반)
  const [endTimeMs, setEndTimeMs] = useState<number | null>(() => {
    if (!initialConfig?.isActive || !initialParticipant) return null;
    const now = Date.now();
    // 초기 로드 시 타이머 복원 (완벽하진 않지만 대략적 추정)
    if (initialBids.length > 0) {
      return now + (initialConfig.extensionTimer * 1000);
    }
    return now + (initialConfig.baseTimer * 1000);
  });
  
  const [isExtension, setIsExtension] = useState(initialBids.length > 0);

  // 이벤트 핸들러
  const handleRealtimeEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    console.log('[AUCTION EVENT]', event, payload);
    const now = Date.now();

    switch (event) {
      case 'BID_PLACED':
        // 새 입찰 추가 및 타이머 연장
        setBids(prev => [payload as unknown as AuctionBidData, ...prev]);
        setEndTimeMs(now + (config.extensionTimer * 1000));
        setIsExtension(true);
        setCurrentParticipant(null); // force refresh state
        break;

      case 'SALE_CONFIRMED':
      case 'PARTICIPANT_PASSED':
      case 'SALE_UNDONE':
        // 낙찰, 유찰, 취소 시 화면 갱신을 위해 데이터 전체 재조회 (안전한 동기화)
        router.refresh();
        setEndTimeMs(null);
        setIsExtension(false);
        break;

      case 'PARTICIPANT_ADVANCED':
        // 새 매물 등장
        router.refresh();
        setEndTimeMs(now + (config.baseTimer * 1000));
        setIsExtension(false);
        setBids([]);
        break;

      case 'AUCTION_RESET':
      case 'AUCTION_TOGGLED':
      case 'PARTICIPANTS_SHUFFLED':
        router.refresh();
        setEndTimeMs(null);
        break;
    }
  }, [config.baseTimer, config.extensionTimer, router]);

  useAuctionRealtime(config?.id, handleRealtimeEvent);

  if (!config || !config.isActive) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl font-black text-muted-foreground opacity-50">경매가 준비 중입니다.</h1>
        <p className="text-lg text-muted-foreground">관리자가 경매를 시작하면 자동으로 화면이 갱신됩니다.</p>
        
        {role === 'ADMIN' && (
          <button onClick={() => router.push('/auction/admin')} className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold">
            관리자 대시보드로 이동
          </button>
        )}
      </div>
    );
  }

  const leaderTeam = role === 'LEADER' ? teams.find(t => t.id === userTeamId) : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between border-b pb-4">
        <h1 className="text-3xl font-black tracking-tight">{config.name}</h1>
        {role === 'ADMIN' && (
          <button onClick={() => router.push('/auction/admin')} className="px-4 py-1.5 bg-zinc-800 text-white rounded font-bold text-sm">
            관리자 콘솔
          </button>
        )}
      </div>

      {role === 'LEADER' && leaderTeam ? (
        <LeaderView 
          auctionId={config.id}
          team={leaderTeam}
          config={config}
          currentParticipant={initialParticipant}
          bids={bids}
          teams={teams}
          endTimeMs={endTimeMs}
          isExtension={isExtension}
        />
      ) : (
        <ViewerView 
          config={config}
          currentParticipant={initialParticipant}
          bids={bids}
          teams={teams}
          endTimeMs={endTimeMs}
          isExtension={isExtension}
        />
      )}
    </>
  );
}
