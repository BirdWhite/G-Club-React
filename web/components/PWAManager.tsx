'use client';

import { useEffect, useState } from 'react';

interface PWAManagerProps {
  children: React.ReactNode;
}

export function PWAManager({ children }: PWAManagerProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // 온라인/오프라인 상태 감지
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 서비스 워커 등록 및 업데이트 감지
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker 등록 성공:', registration);

          // 주기적으로 업데이트 확인 (5분마다)
          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);
        })
        .catch((error) => {
          console.error('Service Worker 등록 실패:', error);
        });

      // 서비스 워커 메시지 수신
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          console.log('캐시가 정리되었습니다.');
        }
        
        if (event.data.type === 'SW_UPDATED') {
          console.log('서비스 워커가 업데이트되었습니다.');
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  return (
    <>
      {children}
      
      {/* 오프라인 상태 표시 */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          오프라인 상태입니다. 연결을 확인해주세요.
        </div>
      )}

    </>
  );
}
