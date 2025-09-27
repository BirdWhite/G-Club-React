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
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    sw.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// 메시지 이벤트 처리 (디버깅용)
self.addEventListener('message', function(event: any) {
  console.log('[custom-worker] Message received:', event.data);
  
  if (event.data.type === 'TEST_PUSH') {
    sw.registration.showNotification(event.data.data.title, {
      body: event.data.data.body,
      icon: event.data.data.icon,
      tag: 'test'
    });
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
  
  event.waitUntil(
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
  );
});

// 설치 이벤트
self.addEventListener('install', function(event: any) {
  console.log('[custom-worker] Service worker installed');
  // 즉시 활성화
  sw.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', function(event: any) {
  console.log('[custom-worker] Service worker activated');
  // 즉시 클라이언트 제어권 가져오기
  event.waitUntil(sw.clients.claim());
});
