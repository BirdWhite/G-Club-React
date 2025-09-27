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
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// 서버 내부에서만 사용하는 개별 사용자 알림 발송
export async function sendPushNotificationInternal({
  userId,
  title,
  body,
  url = '/',
  tag = 'default'
}: Omit<PushNotificationPayload, 'userIds'>) {
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
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag,
      data: {
        url,
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

    // 푸시 알림 발송
    await webpush.sendNotification(pushSubscription, payload);
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

// 서버 내부에서만 사용하는 일괄 알림 발송
export async function sendBulkPushNotificationInternal({
  userIds,
  title,
  body,
  url = '/',
  tag = 'broadcast'
}: Omit<PushNotificationPayload, 'userId'>) {
  if (!userIds || userIds.length === 0) {
    console.log('발송할 사용자 목록이 비어있습니다.');
    return { sent: 0, failed: 0, total: 0 };
  }

  console.log(`일괄 푸시 알림 발송 시작: ${userIds.length}명`);

  const results = await Promise.allSettled(
    userIds.map(userId => 
      sendPushNotificationInternal({ userId, title, body, url, tag })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - successful;

  console.log(`일괄 푸시 알림 발송 완료: 성공 ${successful}건, 실패 ${failed}건`);
  
  return {
    sent: successful,
    failed: failed,
    total: userIds.length
  };
}

// 게임 선호도 기반 사용자 목록 가져오기 (나중에 구현 예정)
export async function getUsersByGamePreference(): Promise<string[]> {
  try {
    const supabase = await createServerClient();
    
    // TODO: 게임 선호도 테이블이 생기면 실제 구현
    // 현재는 임시로 모든 활성 사용자 반환
    const { data: users, error } = await supabase
      .from('UserProfile')
      .select('userId')
      .not('roleId', 'is', null); // 역할이 있는 사용자만

    if (error) {
      console.error('사용자 목록 조회 오류:', error);
      return [];
    }

    return users.map(user => user.userId);
  } catch (error) {
    console.error('게임 선호도 기반 사용자 조회 오류:', error);
    return [];
  }
}

// 게임메이트 관련 알림 템플릿들
export const GameMateNotifications = {
  // 새 게임메이트 모집 알림
  newGamePost: (gameName: string, postId: string) => ({
    title: '🎮 새로운 게임메이트 모집!',
    body: `${gameName} 함께 하실 분을 찾고 있어요!`,
    url: `/game-mate/${postId}`,
    tag: 'new-game-post'
  }),

  // 참여 승인 알림
  participantAccepted: (gameName: string, postId: string) => ({
    title: '✅ 게임 참여 승인!',
    body: `${gameName} 게임에 참여가 승인되었습니다!`,
    url: `/game-mate/${postId}`,
    tag: 'participant-accepted'
  }),

  // 게임 시작 알림
  gameStarting: (gameName: string, postId: string, minutes: number) => ({
    title: '⏰ 게임 시작 알림',
    body: `${gameName} 게임이 ${minutes}분 후 시작됩니다!`,
    url: `/game-mate/${postId}`,
    tag: 'game-starting'
  }),

  // 대기자 승격 알림
  waitlistPromoted: (gameName: string, postId: string) => ({
    title: '🎯 대기자에서 참여자로 승격!',
    body: `${gameName} 게임에 자리가 생겨 참여자로 승격되었습니다!`,
    url: `/game-mate/${postId}`,
    tag: 'waitlist-promoted'
  })
};

// 공지사항 알림 템플릿들
export const NoticeNotifications = {
  newNotice: (title: string, noticeId: string) => ({
    title: '📢 새로운 공지사항',
    body: title,
    url: `/notice/${noticeId}`,
    tag: 'new-notice'
  })
};

// 사용 예시 (주석으로 보관)
/*
// 게임메이트 글 작성 후 알림 발송 예시:
import { sendBulkPushNotificationInternal, GameMateNotifications, getUsersByGamePreference } from '@/lib/notifications/pushNotifications';

// 게임 선호도 기반 사용자들에게 알림 발송
const interestedUsers = await getUsersByGamePreference(gameId);
const notification = GameMateNotifications.newGamePost(gameName, postId);

await sendBulkPushNotificationInternal({
  userIds: interestedUsers,
  ...notification
});
*/
