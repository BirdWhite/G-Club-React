'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | 'unknown'>('unknown');
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  
  // onPermissionChange를 ref로 관리하여 의존성 문제 해결
  const onPermissionChangeRef = useRef(onPermissionChange);
  onPermissionChangeRef.current = onPermissionChange;

  // 기기 핑거프린트 생성 (모든 기기 정보 포함)
  const generateDeviceFingerprint = (): string => {
    const userAgent = navigator.userAgent;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // 기기 타입과 이름
    let deviceType = 'unknown';
    let deviceName = 'Unknown';
    
    if (isMobile) {
      deviceType = 'mobile';
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        deviceName = 'iOS';
      } else if (userAgent.includes('Android')) {
        deviceName = 'Android';
      } else {
        deviceName = 'Mobile';
      }
    } else {
      deviceType = 'desktop';
      if (userAgent.includes('Windows')) {
        deviceName = 'Windows';
      } else if (userAgent.includes('Mac')) {
        deviceName = 'Mac';
      } else if (userAgent.includes('Linux')) {
        deviceName = 'Linux';
      } else {
        deviceName = 'Desktop';
      }
    }
    
    // 브라우저 정보
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return [
      deviceName,                              // 기기 이름
      deviceType,                              // 기기 타입
      browser,                                 // 브라우저
      navigator.maxTouchPoints || '0',        // 터치 지원
      screen.colorDepth,                      // 색상 깊이
      navigator.hardwareConcurrency || '0'    // CPU 코어 수
    ].join('|');
  };

  // 디바이스 타입 감지 함수
  const detectDeviceType = (): 'mobile' | 'desktop' | 'unknown' => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    if (isMobile) {
      return 'mobile';
    } else {
      return 'desktop';
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

  const checkServerSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/push/check?userId=${userId}&deviceFingerprint=${encodeURIComponent(generateDeviceFingerprint())}&deviceType=${deviceType}`);
      if (response.ok) {
        const data = await response.json();
        return data.hasSubscription;
      }
      return false;
    } catch (error) {
      console.error('서버 구독 확인 실패:', error);
      return false;
    }
  }, [userId, deviceType]);

  // 구독 유효성 검증 함수
  const validateSubscription = useCallback(async (subscription: PushSubscription): Promise<boolean> => {
    try {
      // 구독 정보가 완전한지 확인
      if (!subscription.endpoint || !subscription.getKey('p256dh') || !subscription.getKey('auth')) {
        return false;
      }

      // 서버에서 구독 상태 확인
      const response = await fetch('/api/push/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
          deviceFingerprint: generateDeviceFingerprint(),
          deviceType: deviceType
        })
      });

      return response.ok;
    } catch (error) {
      console.error('구독 유효성 검증 실패:', error);
      return false;
    }
  }, [userId, deviceType]);

  const savePushSubscription = useCallback(async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
          deviceFingerprint: generateDeviceFingerprint(),
          deviceType: deviceType,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`구독 정보 저장 실패: ${response.status} ${errorData}`);
      }
    } catch (error) {
      throw error; // 에러를 다시 던져서 상위에서 처리하도록
    }
  }, [userId, deviceType]);

  const checkExistingSubscription = useCallback(async () => {
    // 이미 체크했다면 중복 실행 방지
    if (hasCheckedSubscription) {
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (userId) {
        // 서버에 해당 사용자의 구독이 있는지 확인 (한 번만)
        const serverHasSubscription = await checkServerSubscription();
        setHasCheckedSubscription(true);
        
        if (existingSubscription && serverHasSubscription) {
          // 브라우저와 서버 모두 구독 정보가 있음 - 유효성 검증
          const isValid = await validateSubscription(existingSubscription);
          if (isValid) {
            setSubscription(existingSubscription);
            onPermissionChangeRef.current?.(permission, existingSubscription);
          } else {
            // 유효하지 않은 구독은 재생성 (한 번만)
            console.log('구독이 유효하지 않음, 재구독 시도');
            await existingSubscription.unsubscribe();
            // 재귀 호출 방지를 위해 직접 구독 생성
            try {
              const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
              });
              await savePushSubscription(newSubscription);
              setSubscription(newSubscription);
              onPermissionChangeRef.current?.(permission, newSubscription);
            } catch (error) {
              console.error('재구독 실패:', error);
              setSubscription(null);
              onPermissionChangeRef.current?.(permission, null);
            }
          }
        } else if (existingSubscription && !serverHasSubscription) {
          // 브라우저에는 있지만 서버에는 없음 - 브라우저 구독만 정리 (자동 저장하지 않음)
          console.log('브라우저 구독이 있지만 서버에는 없음, 브라우저 구독 정리');
          try {
            await existingSubscription.unsubscribe();
            setSubscription(null);
            onPermissionChangeRef.current?.(permission, null);
          } catch {
            setSubscription(null);
            onPermissionChangeRef.current?.(permission, null);
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
            onPermissionChangeRef.current?.(permission, null);
          } catch {
            setSubscription(null);
            onPermissionChangeRef.current?.(permission, null);
          }
        } else {
          // 둘 다 없음 - 정상 상태
          setSubscription(null);
          onPermissionChangeRef.current?.(permission, null);
        }
      } else if (existingSubscription) {
        // userId가 없지만 브라우저 구독이 있음
        setSubscription(existingSubscription);
        onPermissionChangeRef.current?.(permission, existingSubscription);
      }
    } catch (error) {
      console.error('기존 구독 확인 실패:', error);
      onPermissionChangeRef.current?.(permission, null);
    }
  }, [userId, permission, hasCheckedSubscription, checkServerSubscription, validateSubscription, savePushSubscription]);

  useEffect(() => {
    if (isInitialized || !userId) return;
    
    // userId가 변경되면 체크 플래그 리셋
    setHasCheckedSubscription(false);
    
    // 디바이스 타입 감지
    const currentDeviceType = detectDeviceType();
    setDeviceType(currentDeviceType);
    
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
  }, [userId, isInitialized, checkExistingSubscription]);

  // 주기적 구독 상태 확인을 위한 별도 useEffect
  useEffect(() => {
    if (!isInitialized || !subscription || permission !== 'granted') return;

    const intervalId = setInterval(() => {
      validateSubscription(subscription).then(isValid => {
        if (!isValid) {
          console.log('주기적 검증에서 구독이 유효하지 않음, 재구독 시도');
          checkExistingSubscription();
        }
      });
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(intervalId);
  }, [isInitialized, subscription, permission, validateSubscription, checkExistingSubscription]);

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
        onPermissionChangeRef.current?.(permission, subscription);
      } else {
        setSubscription(subscription);
        onPermissionChangeRef.current?.(permission, subscription);
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
      onPermissionChangeRef.current?.(permission, null);
    }
  };

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        onPermissionChangeRef.current?.(permission, null);
        
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

  if (!isSupported) {
    return null;
  }

  return (
    <div className="push-notification-manager">

    </div>
  );
}
