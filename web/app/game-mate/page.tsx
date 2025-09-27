'use client';

import { useProfile } from '@/contexts/ProfileProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGamePostListSubscription } from '@/hooks/useRealtimeSubscription';
import { useUrlState } from '@/hooks/useUrlState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MobileGamePostList } from '@/components/game-mate/mobile/MobileGamePostList';
import { DesktopGamePostList } from '@/components/game-mate/desktop/DesktopGamePostList';

export default function GameMatePage() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // URL 상태 관리 - 최상위에서 한 번만 관리
  const [urlState, updateUrlState] = useUrlState({
    gameId: 'all',
    status: 'recruiting',
  });

  // URL 상태를 API 상태로 매핑
  const getApiStatus = (status: string) => {
    if (status === 'all') return undefined;
    if (status === 'recruiting') return 'recruiting';
    if (status === 'open') return 'OPEN';
    if (status === 'full') return 'FULL';
    if (status === 'completed_expired') return 'completed_expired';
    return undefined;
  };

  // 게임 포스트 데이터 - 최상위에서 한 번만 호출
  const { posts, loading, setFilters } = useGamePostListSubscription({
    status: getApiStatus(urlState.status),
    gameId: urlState.gameId === 'all' ? undefined : urlState.gameId,
  });

  const handleGameChange = (gameId: string) => {
    updateUrlState({ gameId });
    setFilters(prev => ({ ...prev, gameId: gameId === 'all' ? undefined : gameId }));
  };

  const handleStatusChange = (status: 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired') => {
    updateUrlState({ status });
    setFilters(prev => ({ ...prev, status: getApiStatus(status) }));
  };

  useEffect(() => {
    // 로딩이 완료된 후에만 역할 확인
    if (!isLoading && profile) {
      // NONE 역할 사용자는 프로필 등록 페이지로 리다이렉트
      if (profile.role?.name === 'NONE') {
        router.push('/');
        return;
      }
    }
  }, [profile, isLoading, router]); // router 의존성 복구

  // 로딩 중이거나 프로필이 없는 경우
  if (isLoading || !profile) {
    return <LoadingSpinner />;
  }

  // NONE 역할 사용자는 리다이렉트되므로 여기까지 오지 않음
  if (profile.role?.name === 'NONE') {
    return null;
  }

  // 공통 props 객체
  const commonProps = {
    userId: profile?.userId || '',
    posts,
    loading,
    urlState,
    onGameChange: handleGameChange,
    onStatusChange: handleStatusChange,
  };

  return (
    <>
      {isMobile ? (
        <div className="h-full bg-background overflow-y-auto scrollbar-visible relative mobile-overscroll">
          {/* 모바일용 콘텐츠 */}
          <main className="px-4 py-6">
            <MobileGamePostList {...commonProps} />
          </main>
          
          {/* 플로팅 액션 버튼 - 하단 네비게이션바 위에 위치 */}
          <button
            onClick={() => router.push('/game-mate/new')}
            className="fixed bottom-24 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-center z-50 transform hover:scale-105"
            style={{
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            aria-label="새 모집글 작성"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div className="h-full bg-background overflow-y-auto scrollbar-visible">
          {/* 데스크톱용 헤더 */}
          <div className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-foreground">게임메이트 찾기</h1>
              <p className="mt-1 text-sm text-muted-foreground">함께 게임을 즐길 파티원을 찾아보세요!</p>
            </div>
          </div>
          
          {/* 데스크톱용 콘텐츠 */}
          <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
            <DesktopGamePostList {...commonProps} />
          </main>
        </div>
      )}
    </>
  );
}
