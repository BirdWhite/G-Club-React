import { createServerClient } from '@/lib/database/supabase/server';

/**
 * 서버에서 Supabase Broadcast를 통해 클라이언트들에게 이벤트를 전송합니다.
 * @param auctionId 경매 ID (채널 식별용)
 * @param event 이벤트 이름 ('BID_PLACED', 'SALE_CONFIRMED', 'AUCTION_UPDATED' 등)
 * @param payload 클라이언트에 전달할 페이로드 데이터
 */
export async function broadcastAuctionUpdate(auctionId: string, event: string, payload: Record<string, unknown>) {
  const supabase = await createServerClient();
  
  // auction:{id} 형태의 전용 채널 생성
  const channel = supabase.channel(`auction:${auctionId}`);
  
  // Broadcast 전송
  await channel.send({
    type: 'broadcast',
    event: event,
    payload: payload,
  });
  
  // 메모리 누수 방지를 위해 전송 후 채널 제거
  await supabase.removeChannel(channel);
}
