'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';

interface Notification {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  type: string;
  sender?: {
    userId: string;
    nickname: string;
    profileImage?: string;
  };
  gamePost?: {
    id: string;
    title: string;
    game: {
      name: string;
    };
  };
  isRead: boolean;
  readAt?: string;
  isClicked: boolean;
  clickedAt?: string;
  createdAt: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // 알림 목록 조회
  const fetchNotifications = async (page: number = 1, unreadOnly: boolean = false) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(unreadOnly && { unreadOnly: 'true' })
      });

      const response = await fetch(`/api/notifications?${params}`);
      const data: NotificationResponse = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setError(null);
      } else {
        setError('알림을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('알림 조회 실패:', error);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 개별 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      setIsMarkingAllRead(true);
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({
            ...notification,
            isRead: true,
            readAt: new Date().toISOString()
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // 알림 클릭 처리
  const handleNotificationClick = async (notification: Notification) => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // 액션 URL이 있으면 이동
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchNotifications(page, showUnreadOnly);
  };

  // 필터 변경
  const handleFilterChange = (unreadOnly: boolean) => {
    setShowUnreadOnly(unreadOnly);
    setCurrentPage(1);
    fetchNotifications(1, unreadOnly);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);


  if (isLoading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">알림</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림` : '모든 알림을 확인했습니다'}
              </p>
            </div>
            <Link
              href="/notifications/settings"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
            >
              설정
            </Link>
          </div>
        </div>

        {/* 필터 및 액션 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !showUnreadOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleFilterChange(true)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showUnreadOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              읽지 않음 ({unreadCount})
            </button>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={isMarkingAllRead}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {isMarkingAllRead ? '처리 중...' : '모두 읽음'}
            </button>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* 알림 목록 */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {showUnreadOnly ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
              </h3>
              <p className="text-muted-foreground">
                {showUnreadOnly ? '모든 알림을 확인했습니다' : '새로운 알림이 오면 여기에 표시됩니다'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-6 rounded-2xl shadow-lg border border-border transition-all cursor-pointer hover:shadow-xl ${
                  notification.isRead
                    ? 'bg-card hover:bg-card/80'
                    : 'bg-card hover:bg-card/80 border-l-4 border-l-primary'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className="flex-shrink-0">
                    {notification.icon ? (
                      <img
                        src={notification.icon}
                        alt="알림 아이콘"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl">
                        🔔
                      </div>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-semibold ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    <p className={`text-sm mb-3 ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {notification.body}
                    </p>

                    {/* 발송자 정보 */}
                    {notification.sender && (
                      <div className="flex items-center gap-2 mb-3">
                        {notification.sender.profileImage ? (
                          <img
                            src={notification.sender.profileImage}
                            alt={notification.sender.nickname}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs text-muted-foreground">
                            {notification.sender.nickname.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {notification.sender.nickname}
                        </span>
                      </div>
                    )}

                    {/* 게임 포스트 정보 */}
                    {notification.gamePost && (
                      <div className="mb-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium text-foreground">
                          {notification.gamePost.game.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.gamePost.title}
                        </p>
                      </div>
                    )}

                    {/* 시간 정보 */}
                    <div className="flex items-center justify-between">
                      <DateTimeDisplay 
                        date={notification.createdAt}
                        className="text-xs text-muted-foreground"
                      />
                      {notification.isRead && notification.readAt && (
                        <span className="text-xs text-muted-foreground">
                          읽음
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
