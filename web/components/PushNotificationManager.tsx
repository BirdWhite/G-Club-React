'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/database/supabase';

interface PushNotificationManagerProps {
  userId?: string;
}

export default function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialCheckComplete, setIsInitialCheckComplete] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // 브라우저 지원 확인
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // 기존 구독 상태 확인
      checkExistingSubscription();
    }
  }, [userId]);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (userId) {
        // 서버에 해당 사용자의 구독이 있는지 확인
        const serverHasSubscription = await checkServerSubscription();
        
        if (existingSubscription && serverHasSubscription) {
          // 브라우저와 서버 모두 구독 정보가 있음
          setSubscription(existingSubscription);
        } else if (existingSubscription && !serverHasSubscription) {
          // 브라우저에는 있지만 서버에는 없음 - 브라우저 구독 정리
          await existingSubscription.unsubscribe();
          setSubscription(null);
          setError('구독 정보가 동기화되지 않았습니다. 다시 구독해주세요.');
        } else if (!existingSubscription && serverHasSubscription) {
          // 서버에는 있지만 브라우저에는 없음 - 서버 구독 정리하고 재구독 필요
          setSubscription(null);
          setError('구독 정보가 동기화되지 않았습니다. 다시 구독해주세요.');
        } else {
          // 둘 다 없음 - 정상 상태
          setSubscription(null);
        }
      } else if (existingSubscription) {
        // userId가 없지만 브라우저 구독이 있음
        setSubscription(existingSubscription);
      }
    } catch (error) {
      console.error('기존 구독 확인 실패:', error);
      setError('구독 상태 확인에 실패했습니다.');
    } finally {
      setIsInitialCheckComplete(true);
    }
  };

  const checkServerSubscription = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/push/check?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.hasSubscription;
      }
      return false;
    } catch (error) {
      console.error('서버 구독 확인 실패:', error);
      return false;
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await subscribeUser();
      }
    } catch (error) {
      console.error('푸시 알림 권한 요청 실패:', error);
      setError('알림 권한 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUser = async () => {
    setIsLoading(true);
    setError(null);
    
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

      // 구독 정보를 서버에 저장
      if (userId) {
        await savePushSubscription(subscription);
        // 서버 저장이 성공한 경우에만 상태 업데이트
        setSubscription(subscription);
      } else {
        setSubscription(subscription);
      }
    } catch (error) {
      console.error('푸시 알림 구독 실패:', error);
      setError('알림 구독에 실패했습니다. 잠시 후 다시 시도해주세요.');
      
      // 구독 실패 시 브라우저 구독도 취소
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          await existingSubscription.unsubscribe();
        }
      } catch (unsubError) {
        console.error('구독 정리 실패:', unsubError);
      }
      setSubscription(null);
    } finally {
      setIsLoading(false);
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
        const errorData = await response.text();
        throw new Error(`구독 정보 저장 실패: ${response.status} ${errorData}`);
      }
    } catch (error) {
      console.error('구독 정보 저장 오류:', error);
      throw error; // 에러를 다시 던져서 상위에서 처리하도록
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 font-semibold mb-2">❌ 오류 발생</h3>
          <p className="text-red-700 mb-3">{error}</p>
          <button
            onClick={() => setError(null)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      )}

      {permission === 'default' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-blue-800 font-semibold mb-2">🔔 알림 설정</h3>
          <p className="text-blue-700 mb-3">
            새로운 게임메이트 모집, 공지사항 등을 실시간으로 받아보세요!
          </p>
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                처리 중...
              </>
            ) : (
              '알림 허용하기'
            )}
          </button>
        </div>
      )}

      {permission === 'granted' && !subscription && !error && isLoading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-green-700">알림이 허용되었습니다. 구독 중...</p>
          </div>
        </div>
      )}

      {permission === 'granted' && !subscription && !error && !isLoading && isInitialCheckComplete && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-blue-800 font-semibold mb-2">🔔 알림 구독</h3>
          <p className="text-blue-700 mb-3">
            푸시 알림을 받으려면 구독해주세요.
          </p>
          <button
            onClick={subscribeUser}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            알림 구독하기
          </button>
        </div>
      )}

      {permission === 'granted' && !subscription && error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-yellow-800 font-semibold mb-2">⚠️ 구독 실패</h3>
          <p className="text-yellow-700 mb-3">
            {error}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                subscribeUser();
              }}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  재시도 중...
                </>
              ) : (
                '다시 시도'
              )}
            </button>
            <button
              onClick={() => {
                setError(null);
                checkExistingSubscription();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              상태 확인
            </button>
          </div>
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
