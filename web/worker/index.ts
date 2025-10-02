// next-pwa 커스텀 워커 - 푸시 알림 기능
// 이 파일은 자동으로 workbox 서비스 워커에 통합됩니다

// 서비스 워커 타입 선언
declare const clients: any;

// 타입 에러 방지를 위한 타입 단언
const sw = self as any;

// 푸시 이벤트 수신
self.addEventListener('push', function(event: any) {
  console.log('[custom-worker] Push event received:', event);
  
  let notificationData = {
    title: '얼티메이트',
    body: '새로운 알림이 있습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'default',
    data: { url: '/' }
  };

  // 푸시 데이터 파싱
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[custom-worker] Push payload:', payload);
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      console.error('[custom-worker] 푸시 데이터 파싱 실패:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    actions: [
      {
        action: 'open',
        title: '확인하기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ],
    requireInteraction: true,  // 사용자 상호작용 요구 (알림 지속성 향상)
    silent: false,
    vibrate: [200, 100, 200],  // 진동 패턴
    priority: 'high',          // 높은 우선순위
    timestamp: Date.now(),     // 타임스탬프
    renotify: true,           // 같은 태그의 알림 재알림
    sticky: true              // 알림 지속성
  };

  event.waitUntil(
    sw.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// 메시지 이벤트 처리
self.addEventListener('message', function(event: any) {
  console.log('[custom-worker] Message received:', event.data);
  
  if (event.data.type === 'TEST_PUSH') {
    sw.registration.showNotification(event.data.data.title, {
      body: event.data.data.body,
      icon: event.data.data.icon,
      tag: 'test'
    });
  }

  // 구독 상태 확인 요청
  if (event.data.type === 'CHECK_SUBSCRIPTION') {
    event.waitUntil(
      sw.registration.pushManager.getSubscription().then((subscription: PushSubscription | null) => {
        if (subscription) {
          // 구독이 있으면 유효성 검증
          fetch('/api/push/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: event.data.userId,
              subscription: subscription.toJSON()
            })
          }).then(response => {
            if (!response.ok) {
              console.log('[custom-worker] 구독이 유효하지 않음, 재구독 필요');
              // 클라이언트에게 재구독 요청
              sw.clients.matchAll().then((clients: any[]) => {
                clients.forEach((client: any) => {
                  client.postMessage({ 
                    type: 'SUBSCRIPTION_INVALID',
                    userId: event.data.userId
                  });
                });
              });
            }
          }).catch(error => {
            console.error('[custom-worker] 구독 검증 실패:', error);
          });
        }
      })
    );
  }
  
  // 캐시 강제 새로고침 요청
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('[custom-worker] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        // 모든 클라이언트에게 캐시 정리 완료 알림
        return sw.clients.matchAll().then(function(clients: any[]) {
          clients.forEach(function(client: any) {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
  
  // 서비스 워커 업데이트 요청
  if (event.data.type === 'UPDATE_SW') {
    event.waitUntil(
      sw.registration.update().then(function() {
        console.log('[custom-worker] Service worker updated');
        return sw.clients.matchAll().then(function(clients: any[]) {
          clients.forEach(function(client: any) {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
    );
  }
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', function(event: any) {
  console.log('[custom-worker] Notification click received.');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // 알림 클릭 시 앱으로 이동
  const urlToOpen = event.notification.data?.url || '/';
  const notificationId = event.notification.data?.notificationId;
  
  console.log('[custom-worker] 알림 클릭 데이터:', {
    url: urlToOpen,
    notificationId: notificationId
  });
  
  event.waitUntil(
    Promise.all([
      // 알림 읽음 처리
      notificationId ? markNotificationAsRead(notificationId) : Promise.resolve(),
      
      // 앱으로 이동
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList: any) {
        // 이미 열린 탭이 있으면 포커스
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        
        // 열린 탭이 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    ])
  );
});

// 알림 읽음 처리 함수
async function markNotificationAsRead(notificationId: string) {
  try {
    console.log(`[custom-worker] 알림 읽음 처리: ${notificationId}`);
    
    // 먼저 사용자의 NotificationReceipt를 찾아서 receiptId를 가져와야 함
    const receiptResponse = await fetch(`/api/notifications/receipt?notificationId=${notificationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!receiptResponse.ok) {
      console.error(`[custom-worker] Receipt 조회 실패: ${notificationId}`, receiptResponse.status);
      return;
    }
    
    const receiptData = await receiptResponse.json();
    const receiptId = receiptData.receiptId;
    
    if (!receiptId) {
      console.error(`[custom-worker] Receipt ID를 찾을 수 없음: ${notificationId}`);
      return;
    }
    
    console.log(`[custom-worker] Receipt ID: ${receiptId}`);
    
    const response = await fetch(`/api/notifications/${receiptId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log(`[custom-worker] 알림 읽음 처리 완료: ${notificationId} (receiptId: ${receiptId})`);
    } else {
      console.error(`[custom-worker] 알림 읽음 처리 실패: ${notificationId}`, response.status);
    }
  } catch (error) {
    console.error(`[custom-worker] 알림 읽음 처리 오류: ${notificationId}`, error);
  }
}

// 설치 이벤트
self.addEventListener('install', function(event: any) {
  console.log('[custom-worker] Service worker installed');
  // 즉시 활성화
  sw.skipWaiting();
});

// 백그라운드 동기화 이벤트
self.addEventListener('sync', function(event: any) {
  console.log('[custom-worker] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 백그라운드 동기화 함수
function doBackgroundSync() {
  console.log('[custom-worker] Performing background sync');
  
  // 먼저 세션이 있는지 확인
  return fetch('/api/profile/check', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store'
  })
  .then(response => {
    // 401 에러는 인증되지 않은 사용자이므로 백그라운드 동기화 건너뛰기
    if (response.status === 401) {
      console.log('[custom-worker] 사용자가 인증되지 않음, 백그라운드 동기화 건너뛰기');
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Profile check failed: ${response.status}`);
    }
    
    // 인증된 사용자만 알림 상태 확인
    return fetch('/api/notifications/check', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store'
    });
  })
  .then(response => {
    if (!response) return null; // 인증되지 않은 사용자
    
    if (response.ok) {
      return response.json();
    }
    throw new Error('Background sync failed');
  })
  .then(data => {
    if (data && data.hasNewNotifications) {
      // 새 알림이 있으면 표시
      return sw.registration.showNotification('새 알림', {
        body: '확인하지 않은 알림이 있습니다.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'background-sync',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        priority: 'high'
      });
    }
  })
  .catch(error => {
    console.error('[custom-worker] Background sync error:', error);
  });
}

// 활성화 이벤트
self.addEventListener('activate', function(event: any) {
  console.log('[custom-worker] Service worker activated');
  
  event.waitUntil(
    Promise.all([
      // 즉시 클라이언트 제어권 가져오기
      sw.clients.claim(),
      // 백그라운드 동기화 등록
      sw.registration.sync.register('background-sync'),
      // 오래된 캐시만 선택적으로 정리 (전체 삭제 대신)
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            // 개발 환경 캐시나 오래된 캐시만 삭제
            if (cacheName.includes('dev') || cacheName.includes('old-')) {
              console.log('[custom-worker] Deleting outdated cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
    ])
  );
});
