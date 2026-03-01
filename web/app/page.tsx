'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProfile } from '@/contexts/ProfileProvider';
import { useRouter } from 'next/navigation';
import { MobileHomePage } from '@/components/mobile/MobileHomePage';
import { DesktopHomePage } from '@/components/desktop/DesktopHomePage';

// 홈 스켈레톤 (로딩이 250ms 이상일 때만 표시) - HeroSection 구조와 동일
function HomeSkeleton() {
  return (
    <section className="h-full flex flex-col justify-start items-center px-8 sm:px-10 lg:px-12 py-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* 1행: 공지사항 + 알림 (HeroSection의 grid와 동일) */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* 공지사항 스켈레톤 */}
          <div className="px-0 py-6">
            <div className="h-7 w-32 bg-muted animate-pulse rounded mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex min-h-[5.5rem] rounded-lg bg-muted/50 animate-pulse overflow-hidden"
                >
                  <div className="shrink-0 w-[100px] sm:w-[120px] aspect-video bg-muted" />
                  <div className="flex-1 min-w-0 p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/4 mt-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 알림 스켈레톤 */}
          <div className="px-0 py-6">
            <div className="h-7 w-24 bg-muted animate-pulse rounded mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="block p-4 min-h-[5.5rem] rounded-lg bg-muted/50 animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 2행: 게임메이트 (GamePostPreview와 동일) */}
        <div className="px-0 py-6">
          <div className="h-7 w-28 bg-muted animate-pulse rounded mb-2" />
          <div className="flex gap-6 overflow-x-auto overflow-y-hidden pb-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-full md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] h-48 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  // 프로필 체크 로직 - 세션 확인 및 프로필 존재 여부에 따른 리다이렉션
  const router = useRouter();
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
  const loadingResolvedRef = useRef(false);

  // 지연 스켈레톤: 로딩이 250ms 이상 걸릴 때만 스켈레톤 표시
  // 로딩이 빨리 끝나면 타이머 콜백에서 스켈레톤 표시를 건너뛰어 깜빡임 방지
  useEffect(() => {
    if (!isLoading) {
      loadingResolvedRef.current = true;
      setShowSkeleton(false);
      return;
    }
    loadingResolvedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadingResolvedRef.current) {
        setShowSkeleton(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 검증되지 않은 사용자: roleId가 null이거나 NONE 역할 → 대기 페이지 (렌더 중 redirect 시 훅 불일치 방지)
  const isUnverified = profile != null && (!profile.roleId || profile.role?.name === 'NONE');
  useEffect(() => {
    if (!isLoading && isUnverified) {
      router.replace('/auth/pending');
    }
  }, [isLoading, isUnverified, router]);

  // 프로필 체크 중 또는 검증 대기: 페이지 레이아웃 즉시 표시, 스켈레톤은 250ms 후에만
  if (isLoading || isUnverified) {
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
