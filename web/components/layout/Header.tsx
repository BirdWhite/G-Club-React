'use client';

import { createClient } from '@/lib/database/supabase';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider'; // 1. useProfile 훅 임포트
import type { Session } from '@supabase/supabase-js';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { useNotificationSubscription } from '@/hooks/useRealtimeSubscription';


export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSession(null);
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      const sessionData = user ? { user } as Session : null;
      setSession(sessionData);
      
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
    // 초기 사용자 정보 로드
    fetchUser();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 세션 상태 업데이트
        setSession(session);
        
        // 로그아웃 시 메인 페이지로 리다이렉트
        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
        // 로그인 성공 시 프로필 페이지로 리다이렉트 (로그인 페이지에서만)
        else if (event === 'SIGNED_IN' && pathname === '/auth/login') {
          router.push('/profile');
        }
      }
    );

    // 페이지 가시성 변경 시 사용자 정보 갱신
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser();
      }
    };

    // 서비스 워커 세션 준비 완료 이벤트 리스너 (단순화)
    const handleSWSessionReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ session: unknown; fromCache: boolean; isPWA: boolean }>;
      const { isPWA } = customEvent.detail || {};
      console.log('서비스 워커 세션 준비 완료:', { isPWA });
      
      // 항상 서버에서 세션을 가져오기
      fetchUser();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('swSessionReady', handleSWSessionReady);

    // 클린업 함수
    return () => {
      // 구독 해제
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('swSessionReady', handleSWSessionReady);
    };
  }, [fetchUser, router, supabase.auth, pathname]); // 의존성 복구
  
  // 프로필 메뉴 열림 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isProfileMenuOpen && !target.closest('.profile-dropdown')) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen]);
  
  // 클라이언트 사이드에서만 실행되는 NavLink 컴포넌트
  const NavLink = ({ href, children, showBadge = false, badgeCount = 0 }: { 
    href: string; 
    children: React.ReactNode;
    showBadge?: boolean;
    badgeCount?: number;
  }) => {
    const pathname = usePathname();
    const isActive = href === '/' ? pathname === href : pathname?.startsWith(href);
    
    return (
      <Link 
        href={href}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium relative ${
          isActive ? 'nav-link-active' : 'nav-link'
        }`}
      >
        {children}
        {showBadge && badgeCount > 0 && (
          <span className="absolute -top-1 -right-4 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    );
  };
  
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

  
  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      // 먼저 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // 이미 로그아웃된 상태
        window.location.href = '/';
        return;
      }
      
      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 카카오 OAuth 세션도 로그아웃 (카카오 계정이면)
      if (session.user?.app_metadata?.provider === 'kakao') {
        try {
          // 카카오 로그아웃 URL로 리다이렉트
          const kakaoLogoutUrl = 'https://kauth.kakao.com/oauth/logout?client_id=' + 
            process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID + 
            '&logout_redirect_uri=' + encodeURIComponent(window.location.origin + '/auth/login');
          
          // 카카오 로그아웃 후 로그인 페이지로 리다이렉트
          window.location.href = kakaoLogoutUrl;
          return;
        } catch (kakaoError) {
          console.error('카카오 로그아웃 중 오류:', kakaoError);
          // 카카오 로그아웃 실패해도 계속 진행
        }
      }
      
      // 상태 초기화
      setSession(null);
      
      // 홈페이지로 리다이렉트 (새로고침하여 모든 상태 초기화)
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 오류가 발생해도 강제로 로그아웃 처리
      setSession(null);
      window.location.href = '/';
    }
  };
  
  return (
    <>
      <header className="header-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                <NavLink href="/">홈</NavLink>
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
                      <NavLink href="/game-mate">게임메이트</NavLink>
                      <NavLink href="/notifications" showBadge={true} badgeCount={unreadNotificationCount}>알림</NavLink>
                      {isAdmin && (
                        <NavLink href="/admin/dashboard">
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
                <div className="flex items-center space-x-2">
                  {/* 프로필 스켈레톤 - 250ms 이상 로딩 시에만 표시 */}
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full" aria-hidden />
                  <div className="hidden md:block h-5 w-5 bg-muted animate-pulse rounded" aria-hidden />
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
                            image={profile?.image && !profile.image.includes('k.kakaocdn.net') ? profile.image : null}
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

                      {/* 로그아웃 드롭다운 - 데스크톱에서만 표시 */}
                      <div className="hidden md:block relative profile-dropdown">
                        <button
                          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                          className="flex items-center justify-center rounded-full p-1 hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-cyber-blue focus:ring-offset-2 focus:ring-offset-transparent"
                          aria-expanded={isProfileMenuOpen}
                          aria-haspopup="true"
                        >
                          <span className="sr-only">로그아웃 메뉴 열기</span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-5 w-5 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* 드롭다운 메뉴 */}
                        {isProfileMenuOpen && (
                          <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md border border-cyber-black-300 bg-cyber-black-50 py-1 shadow-xl ring-1 ring-cyber-black-300 ring-opacity-20 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-200">
                            <Link
                              href={profile?.userId ? `/profile/${profile.userId}` : "/profile"}
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="block w-full px-4 py-2 text-left text-sm text-cyber-gray transition-colors duration-200 hover:bg-cyber-black-100 hover:text-cyber-gray focus:bg-cyber-blue/20 focus:text-cyber-gray focus:outline-none"
                            >
                              내 프로필
                            </Link>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                handleSignOut();
                              }}
                              className="block w-full px-4 py-2 text-left text-sm text-cyber-gray transition-colors duration-200 hover:bg-cyber-black-100 hover:text-cyber-gray focus:bg-cyber-orange/20 focus:text-cyber-gray focus:outline-none cursor-pointer"
                            >
                              로그아웃
                            </button>
                          </div>
                        )}
                      </div>

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
