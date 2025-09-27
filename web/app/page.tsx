'use client';

import { useCallback } from 'react';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProfile } from '@/contexts/ProfileProvider';
import { redirect } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MobileHomePage } from '@/components/mobile/MobileHomePage';
import { DesktopHomePage } from '@/components/desktop/DesktopHomePage';

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

  // 프로필 체크 중일 때 로딩 스피너 표시
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // NONE 역할 사용자는 대기 페이지 표시
  if (profile?.role?.name === 'NONE') {
    redirect('/auth/pending');
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
