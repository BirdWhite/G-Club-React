'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getDisplayImageUrl } from '@/lib/utils/common';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Bell, Megaphone } from 'lucide-react';

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

function NotificationSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-border bg-card animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-5 w-3/4 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-3 w-1/4 bg-muted rounded mt-4" />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false); // 로딩이 250ms 이상일 때만 스켈레톤 표시
  const observerTarget = useRef<HTMLDivElement>(null);

  // 지연 스켈레톤: 로딩이 250ms 이상 걸릴 때만 스켈레톤 표시
  useEffect(() => {
    if (!isLoading || notifications.length > 0) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), 250);
    return () => clearTimeout(timer);
  }, [isLoading, notifications.length]);

  // 알림 목록 조회
  const fetchNotifications = async (page: number = 1, unreadOnly: boolean = false, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(unreadOnly && { unreadOnly: 'true' })
      });

      const response = await fetch(`/api/notifications?${params}`);
      const data: NotificationResponse = await response.json();

      if (data.success) {
        if (append) {
          setNotifications(prev => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        setUnreadCount(data.unreadCount);
        setCurrentPage(data.pagination.page);
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setError(null);
      } else {
        setError('알림을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('알림 조회 실패:', error);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
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

  // 다음 페이지 로드
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchNotifications(currentPage + 1, showUnreadOnly, true);
    }
  }, [currentPage, showUnreadOnly, isLoadingMore, hasMore]);

  // 필터 변경 (로딩 스피너 없이 부드러운 전환)
  const handleFilterChange = (unreadOnly: boolean) => {
    if (showUnreadOnly === unreadOnly) return;
    setShowUnreadOnly(unreadOnly);
    setCurrentPage(1);
    setHasMore(true);
    fetchNotifications(1, unreadOnly, false);
  };

  // Intersection Observer로 무한 스크롤 구현
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, isLoadingMore]);

  useEffect(() => {
    fetchNotifications();
  }, []);


  return (
    <div className="bg-background">
      <div className="container mx-auto px-8 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
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

        {/* 알림 목록 - 로딩 시 스켈레톤, 필터 전환 시 부드러운 opacity 전환 */}
        <div
          className={`space-y-4 transition-opacity duration-300 ease-out ${
            isLoading && notifications.length > 0 ? 'opacity-70 pointer-events-none' : 'opacity-100'
          }`}
        >
          {isLoading && notifications.length === 0 && showSkeleton ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : isLoading && notifications.length === 0 ? (
            <div className="min-h-[200px]" aria-hidden />
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {showUnreadOnly ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
              </h3>
              <p className="text-muted-foreground">
                {showUnreadOnly ? '모든 알림을 확인했습니다' : '새로운 알림이 오면 여기에 표시됩니다'}
              </p>
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
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
                      {notification.type === 'NOTICE_NEW' ? (
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                          <Megaphone className="w-6 h-6" />
                        </div>
                      ) : notification.icon ? (
                        <Image
                          src={notification.icon}
                          alt="알림 아이콘"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                          <Bell className="w-6 h-6" />
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
                          {(() => {
                            const img = getDisplayImageUrl(notification.sender.profileImage);
                            return img ? (
                            <Image
                              src={img}
                              alt={notification.sender.nickname}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            ) : (
                            <div className="w-6 h-6 bg-background rounded-full flex items-center justify-center text-xs text-muted-foreground border border-border">
                              {notification.sender.nickname.charAt(0)}
                            </div>
                          );
                          })()}
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
              ))}

              {/* 무한 스크롤 트리거 */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <LoadingSpinner />
                    <span>로딩 중...</span>
                  </div>
                )}
                {!hasMore && notifications.length > 0 && (
                  <p className="text-sm text-muted-foreground">모든 알림을 불러왔습니다</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
