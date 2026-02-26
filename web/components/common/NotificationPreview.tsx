'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { ChevronRight, Bell } from 'lucide-react';

interface NotificationPreviewItem {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationPreviewResponse {
  success: boolean;
  notifications: NotificationPreviewItem[];
  unreadCount: number;
}

export function NotificationPreview() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationPreviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const markAsRead = async (receiptId: string) => {
    try {
      const response = await fetch(`/api/notifications/${receiptId}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === receiptId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch {
      // 읽음 처리 실패해도 이동은 진행
    }
  };

  const handleNotificationClick = async (
    e: React.MouseEvent,
    notification: NotificationPreviewItem
  ) => {
    e.preventDefault();
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    const url = notification.actionUrl || '/notifications';
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=3');
        const data: NotificationPreviewResponse = await response.json();

        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }

        if (data.success) {
          setIsAuthenticated(true);
          setNotifications(data.notifications);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  if (isLoading) {
    return (
      <div className="px-0 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/notifications"
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
          >
            <Bell className="w-5 h-5" />
            알림
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="px-0 py-6">
        <Link
          href="/notifications"
          className="flex items-center justify-between gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            알림
          </div>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border text-center">
          <p className="text-sm text-muted-foreground">로그인하여 알림을 확인하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-0 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/notifications"
          className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
        >
          <Bell className="w-5 h-5" />
          알림
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-6">
          <Bell className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">알림이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <Link
              key={notification.id}
              href={notification.actionUrl || '/notifications'}
              onClick={(e) => handleNotificationClick(e, notification)}
              className={`block p-4 min-h-[5.5rem] rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group cursor-pointer ${
                notification.isRead ? 'bg-card' : 'bg-card border-l-4 border-l-primary'
              }`}
            >
              <h3 className={`font-medium line-clamp-1 mb-2 group-hover:text-primary transition-colors ${
                notification.isRead ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {notification.title}
              </h3>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex-1 min-w-0 line-clamp-1">
                  {notification.body || '\u00A0'}
                </span>
                <DateTimeDisplay
                  date={notification.createdAt}
                  className="text-xs shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
