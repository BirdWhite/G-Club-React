'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/database/supabase/client';

export function useAuctionRealtime(
  auctionId: string | undefined | null,
  onEvent: (event: string, payload: any) => void
) {
  useEffect(() => {
    if (!auctionId) return;

    const supabase = createClient();
    
    // 채널 구독 및 브로드캐스트 리스닝
    const channel = supabase
      .channel(`auction:${auctionId}`)
      .on('broadcast', { event: '*' }, (payload) => {
        // payload.event: 'BID_PLACED', 'SALE_CONFIRMED' 등
        // payload.payload: 전송된 데이터
        onEvent(payload.event, payload.payload);
      })
      .subscribe();

    // 언마운트 시 채널 정리
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, onEvent]);
}
