'use client';

import { useProfile } from '@/contexts/ProfileProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGamePostListSubscription } from '@/hooks/useRealtimeSubscription';
import { useUrlState } from '@/hooks/useUrlState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { GamePostList } from '@/components/game-mate/GamePostList';

export default function GameMatePage() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();

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
    if (status === 'full') return 'full'; // isFull 기반 필터링으로 변경
    if (status === 'completed_expired') return 'completed_expired';
    return undefined;
  };

  // 게임 포스트 데이터 - 최상위에서 한 번만 호출
  const { 
    posts, 
    loading: postsLoading, 
    setFilters 
  } = useGamePostListSubscription({
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
      // 검증되지 않은 사용자(roleId null 또는 NONE)는 대기 페이지로 리다이렉트
      const isUnverified = !profile.roleId || profile.role?.name === 'NONE';
      if (isUnverified) {
        router.push('/auth/pending');
        return;
      }
    }
  }, [profile, isLoading, router]); // router 의존성 복구

  // 로딩 중이거나 프로필이 없는 경우
  if (isLoading || !profile) {
    return <LoadingSpinner />;
  }

  // 검증되지 않은 사용자는 리다이렉트되므로 여기까지 오지 않음
  const isUnverified = !profile.roleId || profile.role?.name === 'NONE';
  if (isUnverified) {
    return null;
  }

  // 공통 props 객체
  const commonProps = {
    userId: profile?.userId || '',
    posts,
    loading: postsLoading,
    urlState,
    onGameChange: handleGameChange,
    onStatusChange: handleStatusChange,
  };

  return (
    <div className="h-full bg-background overflow-y-auto scrollbar-visible mobile-overscroll pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))] md:pb-8">
      {/* RWD 통합 게임메이트 리스트 */}
      <main className="flex flex-col items-center page-content-padding py-8">
        <div className="w-full max-w-4xl">
          <GamePostList {...commonProps} />
        </div>
      </main>
    </div>
  );
}
