'use client';

import { useCallback, useState, useEffect } from 'react';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProfile } from '@/contexts/ProfileProvider';
import { redirect } from 'next/navigation';
import { MobileHomePage } from '@/components/mobile/MobileHomePage';
import { DesktopHomePage } from '@/components/desktop/DesktopHomePage';

// 홈 스켈레톤 (로딩이 250ms 이상일 때만 표시)
function HomeSkeleton() {
  return (
    <section className="h-full flex flex-col justify-start items-center px-8 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-7xl space-y-6">
        <div className="px-0 py-6">
          <div className="h-7 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-0 py-6">
          <div className="h-7 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-80 h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  // 프로필 체크 로직 - 세션 확인 및 프로필 존재 여부에 따른 리다이렉션
  const { isLoading } = useProfileCheck();
  const { profile } = useProfile();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // 시작하기 버튼 클릭 이벤트 핸들러 - useCallback으로 메모이제이션
  const handleStartClick = useCallback(() => {
    // 시작하기 버튼 클릭 로직
    console.log('시작하기 클릭됨');
  }, []);

  // 더 알아보기 버튼 클릭 이벤트 핸들러 - useCallback으로 메모이제이션
  const handleLearnMoreClick = useCallback(() => {
    // 더 알아보기 버튼 클릭 로직
    console.log('더 알아보기 클릭됨');
  }, []);

  const [showSkeleton, setShowSkeleton] = useState(false);

  // 지연 스켈레톤: 로딩이 250ms 이상 걸릴 때만 스켈레톤 표시
  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), 250);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 검증되지 않은 사용자: roleId가 null이거나 NONE 역할 → 대기 페이지
  const isUnverified = !profile?.roleId || profile?.role?.name === 'NONE';
  if (!isLoading && isUnverified) {
    redirect('/auth/pending');
  }

  // 프로필 체크 중: 페이지 레이아웃 즉시 표시, 스켈레톤은 250ms 후에만
  if (isLoading) {
    return (
      <div className="h-full bg-background">
        {showSkeleton ? (
          <HomeSkeleton />
        ) : (
          <div className="min-h-[400px]" aria-hidden />
        )}
      </div>
    );
  }

  // 메인 페이지 렌더링
  return (
    <>
      {isMobile ? (
        <MobileHomePage onStartClick={handleStartClick} onLearnMoreClick={handleLearnMoreClick} />
      ) : (
        <DesktopHomePage onStartClick={handleStartClick} onLearnMoreClick={handleLearnMoreClick} />
      )}
    </>
  );
}
