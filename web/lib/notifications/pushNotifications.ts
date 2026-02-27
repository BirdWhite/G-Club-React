// 서버 내부 푸시 알림 발송 유틸리티 함수들
import { createServerClient } from '@/lib/database/supabase';
import webpush from 'web-push';

// VAPID 설정
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@pnu-ultimate.kro.kr',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushNotificationPayload {
  userId?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationId?: string;
  priority?: 'very-low' | 'low' | 'normal' | 'high';
  ttl?: number;
}

export async function sendPushNotificationInternal({
  userId,
  title,
  body,
  url = '/',
  tag = 'default',
  notificationId,
  priority = 'high',
  ttl = 600
}: PushNotificationPayload) {
  try {
    const supabase = await createServerClient();

    // 사용자의 구독 정보 가져오기
    const { data: subscription, error } = await supabase
      .from('PushSubscription')
      .select('endpoint, p256dh, auth')
      .eq('userId', userId)
      .eq('isEnabled', true)
      .single();

    if (error || !subscription) {
      console.log(`사용자 ${userId}의 구독 정보가 없습니다.`);
      return false;
    }

    // 푸시 알림 페이로드
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/maskable_icon_x192.png',
      badge: '/icons/maskable_icon_x192.png',
      tag,
      data: {
        url,
        notificationId, // 알림 ID 포함
        timestamp: Date.now()
      }
    });

    // 구독 객체 구성
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    // 푸시 알림 발송 옵션
    const options = {
      TTL: ttl, // TTL 동적 설정
      urgency: priority, // 우선순위 동적 설정
      headers: {}
    };

    // 푸시 알림 발송
    await webpush.sendNotification(pushSubscription, payload, options);
    console.log(`푸시 알림 발송 성공: ${userId}`);
    return true;

  } catch (error: unknown) {
    console.error(`푸시 알림 발송 실패 (${userId}):`, error);
    
    // 구독이 만료된 경우 DB에서 제거
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
      try {
        const supabase = await createServerClient();
        await supabase
          .from('PushSubscription')
          .delete()
          .eq('userId', userId);
        console.log(`만료된 구독 정보 삭제: ${userId}`);
      } catch (deleteError) {
        console.error('만료된 구독 정보 삭제 실패:', deleteError);
      }
    }
    
    return false;
  }
}

