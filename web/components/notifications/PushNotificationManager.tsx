'use client';

import { useEffect, useState } from 'react';

interface PushNotificationManagerProps {
  userId?: string;
  onPermissionChange?: (permission: NotificationPermission, subscription: PushSubscription | null) => void;
  masterEnabled?: boolean; // 마스터 토글 상태
}

export function PushNotificationManager({ userId, onPermissionChange, masterEnabled }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized || !userId) return;
    
    // PWA 설치 여부 확인
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as { standalone?: boolean }).standalone === true;
    
    // PWA가 설치되지 않은 경우 알림 기능 비활성화
    if (!isPWA) {
      setIsSupported(false);
      setIsInitialized(true);
      return;
    }
    
    // 브라우저 지원 확인
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // PWA 환경에서 권한 상태 정확히 확인
      const checkPermission = async () => {
        try {
          // 현재 기기의 권한 상태만 확인 (다른 기기 구독과 무관)
          const currentPermission = Notification.permission;
          setPermission(currentPermission);
          
          // next-pwa가 자동 등록한 서비스 워커 사용
          checkExistingSubscription();
        } catch (error) {
          console.error('PWA 권한 확인 실패:', error);
          setPermission(Notification.permission);
          checkExistingSubscription();
        }
      };
      
      checkPermission();
    }
    
    setIsInitialized(true);
  }, [userId, isInitialized]);

  // 마스터 토글 상태에 따른 구독/구독 취소 처리
  useEffect(() => {
    if (!isInitialized || masterEnabled === undefined) return; // 초기화 완료 전이거나 초기 로딩 중이면 무시
    
    if (masterEnabled) {
      // 마스터 토글이 켜지면 구독
      if (permission === 'granted' && !subscription) {
        subscribeUser();
      }
    } else {
      // 마스터 토글이 꺼지면 구독 취소
      if (subscription) {
        unsubscribe();
      }
    }
  }, [masterEnabled, permission, subscription, isInitialized]);


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
          onPermissionChange?.(permission, existingSubscription);
        } else if (existingSubscription && !serverHasSubscription) {
          // 브라우저에는 있지만 서버에는 없음 - 서버에 구독 정보 저장
          try {
            await savePushSubscription(existingSubscription);
            setSubscription(existingSubscription);
            onPermissionChange?.(permission, existingSubscription);
          } catch {
            // 저장 실패 시 브라우저 구독 정리
            await existingSubscription.unsubscribe();
            setSubscription(null);
            onPermissionChange?.(permission, null);
          }
        } else if (!existingSubscription && serverHasSubscription) {
          // 서버에는 있지만 브라우저에는 없음 - 서버 구독 정보 정리
          try {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId })
            });
            setSubscription(null);
            onPermissionChange?.(permission, null);
          } catch {
            setSubscription(null);
            onPermissionChange?.(permission, null);
          }
        } else {
          // 둘 다 없음 - 정상 상태
          setSubscription(null);
          onPermissionChange?.(permission, null);
        }
      } else if (existingSubscription) {
        // userId가 없지만 브라우저 구독이 있음
        setSubscription(existingSubscription);
        onPermissionChange?.(permission, existingSubscription);
      }
    } catch {
      onPermissionChange?.(permission, null);
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
    } catch {
      return false;
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

      // 구독 정보를 서버에 저장
      if (userId) {
        await savePushSubscription(subscription);
        // 서버 저장이 성공한 경우에만 상태 업데이트
        setSubscription(subscription);
        onPermissionChange?.(permission, subscription);
      } else {
        setSubscription(subscription);
        onPermissionChange?.(permission, subscription);
      }
    } catch {
      // 구독 실패 시 브라우저 구독도 취소
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          await existingSubscription.unsubscribe();
        }
      } catch {
        // 구독 정리 실패 무시
      }
      setSubscription(null);
      onPermissionChange?.(permission, null);
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
      throw error; // 에러를 다시 던져서 상위에서 처리하도록
    }
  };

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        onPermissionChange?.(permission, null);
        
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
    } catch {
      // 구독 해제 실패 무시
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

    </div>
  );
}
