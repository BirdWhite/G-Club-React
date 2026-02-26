'use client';

import { useEffect, useState, useCallback } from 'react';

interface PWAManagerProps {
  children: React.ReactNode;
}

export function PWAManager({ children }: PWAManagerProps) {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // 캐시 강제 새로고침 함수
  const clearCache = useCallback(async () => {
    if (!swRegistration?.active) return;
    
    try {
      // 모든 캐시 삭제
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      // 서비스 워커 재시작
      await swRegistration.unregister();
      window.location.reload();
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
    }
  }, [swRegistration]);

  // 서비스 워커 업데이트 함수
  const updateServiceWorker = useCallback(async () => {
    if (!swRegistration?.waiting) return;
    
    try {
      // 대기 중인 서비스 워커에게 업데이트 신호 전송
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    } catch (error) {
      console.error('서비스 워커 업데이트 실패:', error);
    }
  }, [swRegistration]);

  useEffect(() => {

    // PWA 환경 감지
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as { standalone?: boolean }).standalone === true;

    // 서비스 워커 등록 (단순화)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          setSwRegistration(registration);
          
          // 즉시 세션 준비 이벤트 발생 (캐시 없이)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('swSessionReady', {
              detail: { session: null, fromCache: false, isPWA }
            }));
          }, 100);
          
          // 탭이 보일 때만 서비스 워커 업데이트 확인 (탭 복귀 시 불필요한 controllerchange 방지)
          setInterval(() => {
            if (document.visibilityState === 'visible') {
              registration.update();
            }
          }, 5 * 60 * 1000); // 5분마다
        })
        .catch((error) => {
          console.error('Service Worker 등록 실패:', error);
          // 서비스 워커 등록 실패 시에도 세션 준비 이벤트 발생
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('swSessionReady', {
              detail: { session: null, fromCache: false, isPWA }
            }));
          }, 100);
        });

      // 서비스 워커 메시지 리스너
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SUBSCRIPTION_INVALID') {
          console.log('[PWAManager] 구독이 유효하지 않음, 재구독 필요');
          // 구독 무효화 이벤트 발생
          window.dispatchEvent(new CustomEvent('subscriptionInvalid', {
            detail: { userId: event.data.userId }
          }));
        }
      });
    } else {
      // 서비스 워커를 지원하지 않는 환경
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('swSessionReady', {
          detail: { session: null, fromCache: false, isPWA }
        }));
      }, 100);
    }

    // 개발 환경에서 전역 함수로 노출
    if (process.env.NODE_ENV === 'development') {
      (window as typeof window & {
        clearPWACache?: () => Promise<void>;
        updateServiceWorker?: () => Promise<void>;
      }).clearPWACache = clearCache;
      (window as typeof window & {
        clearPWACache?: () => Promise<void>;
        updateServiceWorker?: () => Promise<void>;
      }).updateServiceWorker = updateServiceWorker;
    }

    return () => {
      // cleanup
    };
  }, [clearCache, updateServiceWorker]);

  return <>{children}</>;
}