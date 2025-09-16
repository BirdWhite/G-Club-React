'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PushNotificationManagerProps {
  userId?: string;
}

export default function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // 브라우저 지원 확인
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeUser();
      }
    } catch (error) {
      console.error('푸시 알림 권한 요청 실패:', error);
    }
  };

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID 공개 키 (자체 생성)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID 공개 키가 설정되지 않았습니다');
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(subscription);

      // 구독 정보를 서버에 저장
      if (userId) {
        await savePushSubscription(subscription);
      }

      console.log('푸시 알림 구독 성공:', subscription);
    } catch (error) {
      console.error('푸시 알림 구독 실패:', error);
    }
  };

  const savePushSubscription = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('구독 정보 저장 실패');
      }
    } catch (error) {
      console.error('구독 정보 저장 오류:', error);
    }
  };

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        
        // 서버에서도 구독 정보 제거
        if (userId) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
          });
        }
      }
    } catch (error) {
      console.error('구독 해제 실패:', error);
    }
  };

  // VAPID 키 변환 유틸리티
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="push-notification-manager">
      {permission === 'default' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-blue-800 font-semibold mb-2">🔔 알림 설정</h3>
          <p className="text-blue-700 mb-3">
            새로운 게임메이트 모집, 공지사항 등을 실시간으로 받아보세요!
          </p>
          <button
            onClick={requestPermission}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            알림 허용하기
          </button>
        </div>
      )}

      {permission === 'granted' && !subscription && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-700">알림이 허용되었습니다. 구독 중...</p>
        </div>
      )}

      {permission === 'granted' && subscription && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-800 font-semibold">✅ 알림 활성화됨</h3>
              <p className="text-green-700 text-sm">실시간 알림을 받고 있습니다.</p>
            </div>
            <button
              onClick={unsubscribe}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              알림 끄기
            </button>
          </div>
        </div>
      )}

      {permission === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 font-semibold">❌ 알림이 차단됨</h3>
          <p className="text-red-700 text-sm">
            브라우저 설정에서 알림을 허용해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
