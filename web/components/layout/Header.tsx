'use client';

import { createClient } from '@/lib/database/supabase';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import type { Session } from '@supabase/supabase-js';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { NavLink } from '@/components/layout/NavLink';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { useNotificationSubscription } from '@/hooks/useRealtimeSubscription';


export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  
  const { profile, isLoading: profileLoading } = useProfile(); // 2. useProfile 훅 호출
  const isAdmin = profile?.role?.name === 'ADMIN' || profile?.role?.name === 'SUPER_ADMIN'; // 3. isAdmin 변수 생성
  const isPendingMember = !profile?.roleId || profile?.role?.name === 'NONE'; // 검증 대기: roleId null 또는 NONE

  // 세션과 프로필 로딩 통합: 세션이 있는데 프로필이 아직 없거나 로딩 중이면 로딩 상태 유지 (레이아웃 시프트 방지)
  const isNavLoading = isLoading || (!!session && (profileLoading || profile === null));

  // 지연 스켈레톤: 250ms 이상 로딩될 때만 스켈레톤 표시 (빠른 로딩 시 깜빡임 방지)
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    if (!isNavLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), 250);
    return () => clearTimeout(timer);
  }, [isNavLoading]);

  // 실시간 알림 구독
  const { unreadCount: unreadNotificationCount } = useNotificationSubscription(session?.user?.id || null);

  // 현재 페이지 제목을 반환하는 함수
  const getPageTitle = () => {
    if (pathname === '/') return '홈';
    if (pathname === '/game-mate') return '게임메이트';
    if (pathname.startsWith('/profile/') && pathname !== '/profile/edit') return '프로필';
    if (pathname === '/profile/edit') return '프로필 수정';
    if (pathname === '/profile') return '프로필';
    if (pathname === '/admin/dashboard') return '관리자 대시보드';
    if (pathname === '/auth/login') return '로그인';
    if (pathname.startsWith('/admin/')) return '관리자';
    if (pathname.startsWith('/game-mate/')) return '게임메이트';
    if (pathname === '/notices') return '공지사항';
    if (pathname === '/notices/new') return '공지사항 작성';
    if (pathname.startsWith('/notices/') && pathname.includes('/edit')) return '공지사항 수정';
    if (pathname.startsWith('/notices/')) return '공지사항';
    if (pathname.startsWith('/channels/')) return '채널';
    if (pathname.startsWith('/notifications')) return '알림';
    return ''; // 기본값을 빈 문자열로 변경
  };

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        currentUserIdRef.current = null;
        setSession((prev) => (prev !== null ? null : prev));
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      currentUserIdRef.current = user?.id ?? null;
      const sessionData = user ? { user } as Session : null;
      setSession((prev) => {
        if (!prev && !sessionData) return prev;
        if (prev?.user?.id === sessionData?.user?.id) return prev;
        return sessionData;
      });

      return user;
    } catch (error) {
      console.error('사용자 정보를 가져오는 중 오류 발생:', error);
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          currentUserIdRef.current = null;
          setSession(null);
          router.push('/');
          return;
        }

        // Supabase는 탭 포커스 시 토큰 갱신 목적으로 SIGNED_IN을 발생시킴
        // 같은 유저면 세션 업데이트를 스킵해서 불필요한 리렌더 방지
        const newUserId = session?.user?.id ?? null;
        if (newUserId && newUserId === currentUserIdRef.current) {
          return;
        }

        currentUserIdRef.current = newUserId;
        setSession(session);

        if (event === 'SIGNED_IN' && pathname === '/auth/login') {
          router.push('/profile');
        }
      }
    );

    const handleSWSessionReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ session: unknown; fromCache: boolean; isPWA: boolean }>;
      const { isPWA } = customEvent.detail || {};
      console.log('서비스 워커 세션 준비 완료:', { isPWA });
      fetchUser();
    };

    window.addEventListener('swSessionReady', handleSWSessionReady);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('swSessionReady', handleSWSessionReady);
    };
  }, [fetchUser, router, supabase.auth, pathname]);
  
  // 프로필 업데이트 이벤트 리스너
  useEffect(() => {
    if (!session?.user) return;
    
    // 프로필 업데이트 이벤트 리스너
    const handleProfileUpdate = () => {
      // ProfileProvider의 refetchProfile 함수 호출
      // 이는 전역 프로필 상태를 새로고침합니다
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('refreshProfile'));
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [session?.user]);

  
  return (
    <>
      <header className="header-container">
        <div className="flex justify-center px-8 sm:px-10 lg:px-12">
          <div className="w-full max-w-4xl flex items-center justify-between h-16">
            {/* 로고 영역 - 좌측 */}
            <div className="flex items-center">
              {/* 데스크톱 로고 */}
              <div className="hidden md:flex items-center">
                <Link href="/" className="flex items-center group">
                  <svg 
                    version="1.2" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 250 250" 
                    width="32" 
                    height="32"
                    className="header-logo transition-colors duration-200"
                  >
                    <title>Ultimate</title>
                    <g id="Layer 1">
                      <path id="모양 3" fillRule="evenodd" className="fill-current" d="m125.3 178.4l17.7-15.4v-67.8l96.4-51.5 5.2-40.6-137 72.5v87.3z"/>
                      <path id="모양 1" fillRule="evenodd" className="fill-current" d="m6 3l4.9 40.6 76.8 40.9v-38z"/>
                      <path id="모양 2" fillRule="evenodd" className="fill-current" d="m14.3 70.7l4.9 40.5 33 17.6v55.7l73.2 61.8 72.9-61.4-0.2-56 32.8-17.5 5.3-40.7-73.5 39.1 0.1 60.4-37.5 31.7-37.4-31.4v-60.6z"/>
                    </g>
                  </svg>
                </Link>
              </div>
              
              {/* 모바일 로고 */}
              <div className="flex md:hidden items-center">
                <Link href="/" className="flex items-center group">
                  <svg 
                    version="1.2" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 250 250" 
                    width="28" 
                    height="28"
                    className="header-logo transition-colors duration-200"
                  >
                    <title>Ultimate</title>
                    <g id="Layer 1">
                      <path id="모양 3" fillRule="evenodd" className="fill-current" d="m125.3 178.4l17.7-15.4v-67.8l96.4-51.5 5.2-40.6-137 72.5v87.3z"/>
                      <path id="모양 1" fillRule="evenodd" className="fill-current" d="m6 3l4.9 40.6 76.8 40.9v-38z"/>
                      <path id="모양 2" fillRule="evenodd" className="fill-current" d="m14.3 70.7l4.9 40.5 33 17.6v55.7l73.2 61.8 72.9-61.4-0.2-56 32.8-17.5 5.3-40.7-73.5 39.1 0.1 60.4-37.5 31.7-37.4-31.4v-60.6z"/>
                    </g>
                  </svg>
                </Link>
              </div>

              {/* 데스크톱 네비게이션 - 고정 최소 너비로 시프트 방지 */}
              <nav className="hidden md:ml-6 md:flex md:items-center md:space-x-6 lg:space-x-8">
                <NavLink href="/" pathname={pathname}>홈</NavLink>
                {/* 항상 동일한 공간 확보 (스켈레톤/링크/placeholder 전환 시 레이아웃 시프트 방지) */}
                <div className="flex items-center space-x-6 lg:space-x-8 min-w-[240px]">
                  {isNavLoading && showSkeleton ? (
                    <>
                      <div className="h-4 w-[72px] bg-muted animate-pulse rounded shrink-0" aria-hidden />
                      <div className="h-4 w-10 bg-muted animate-pulse rounded shrink-0" aria-hidden />
                      <div className="h-4 w-[100px] bg-muted animate-pulse rounded shrink-0" aria-hidden />
                    </>
                  ) : isNavLoading ? (
                    /* 빠른 로딩 시: 스켈레톤 대신 투명 placeholder (깜빡임 방지) */
                    <>
                      <span className="text-sm font-medium opacity-0 pointer-events-none select-none" aria-hidden>게임메이트</span>
                      <span className="text-sm font-medium opacity-0 pointer-events-none select-none" aria-hidden>알림</span>
                    </>
                  ) : session && !isPendingMember ? (
                    <>
                      <NavLink href="/game-mate" pathname={pathname}>게임메이트</NavLink>
                      <NavLink href="/notifications" pathname={pathname} showBadge={true} badgeCount={unreadNotificationCount}>알림</NavLink>
                      {isAdmin && (
                        <NavLink href="/admin/dashboard" pathname={pathname}>
                          관리자 대시보드
                        </NavLink>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium opacity-0 pointer-events-none select-none" aria-hidden>게임메이트</span>
                      <span className="text-sm font-medium opacity-0 pointer-events-none select-none" aria-hidden>알림</span>
                    </>
                  )}
                </div>
              </nav>
            </div>

            {/* 페이지 제목 - 모바일에서만 표시 */}
            <div className="flex-1 flex items-center justify-center sm:hidden">
              {getPageTitle() && (
                <h1 className="text-lg font-semibold text-header-foreground">
                  {getPageTitle()}
                </h1>
              )}
            </div>

            {/* 프로필 영역 - 우측 상단 */}
            <div className="flex items-center">
              {isNavLoading && showSkeleton ? (
                <div className="flex items-center">
                  {/* 프로필 스켈레톤 - 250ms 이상 로딩 시에만 표시 */}
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full" aria-hidden />
                </div>
              ) : isNavLoading ? (
                /* 빠른 로딩 시: 스켈레톤 대신 투명 placeholder (깜빡임 방지) */
                <div className="h-8 w-8 shrink-0" aria-hidden />
              ) : session ? (
                    <div className="flex items-center space-x-2">
                      {/* 프로필 사진 */}
                      <Link href={profile?.userId ? `/profile/${profile.userId}` : "/profile"} className="group relative flex rounded-full focus:outline-none">
                        <span className="sr-only">프로필 페이지로 이동</span>
                        <div className={`relative transition-all duration-200 ${
                          pathname === (profile?.userId ? `/profile/${profile.userId}` : "/profile") || pathname === '/profile/edit'
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent rounded-full'
                            : ''
                        }`}>
                          <ProfileAvatar
                            name={profile?.name}
                            image={profile?.image && !profile.image.includes('kakaocdn.net') ? profile.image : null}
                            size="md"
                            className={`transition-all duration-200 group-hover:scale-110 ${
                              pathname === (profile?.userId ? `/profile/${profile.userId}` : "/profile") || pathname === '/profile/edit'
                                ? 'shadow-lg shadow-primary/50'
                                : ''
                            }`}
                            unoptimized={profile?.image?.includes('127.0.0.1')}
                          />
                          {/* 사이버 블루 원 효과 - 활성 상태일 때만 표시 */}
                          {(pathname === (profile?.userId ? `/profile/${profile.userId}` : "/profile") || pathname === '/profile/edit') && (
                            <div className="absolute inset-0 rounded-full border border-primary animate-pulse"></div>
                          )}
                        </div>
                      </Link>

                    </div>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center px-3 py-2 md:px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-cyber-black bg-cyber-blue hover:bg-cyber-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-blue focus:ring-offset-cyber-black transition-colors"
                    >
                      로그인
                    </Link>
                  )}
            </div>
          </div>
        </div>
      </header>

      {/* 모바일 네비게이션바 */}
      <MobileNavigation session={session} isPendingMember={isPendingMember} />
    </>
  );
}
