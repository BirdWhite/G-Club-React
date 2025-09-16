'use client';

import { useCallback } from 'react';
import { useProfileCheck, useMediaQuery } from '@/hooks';
import { useProfile } from '@/contexts/ProfileProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MembershipPendingPage } from '@/components/MembershipPendingPage';
import MobileHomePage from '@/components/mobile/MobileHomePage';
import DesktopHomePage from '@/components/desktop/DesktopHomePage';
import PushNotificationManager from '@/components/PushNotificationManager';

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
    return <MembershipPendingPage />;
  }

  // 메인 페이지 렌더링
  return (
    <>
      {/* 푸시 알림 관리자 */}
      <PushNotificationManager userId={profile?.userId} />
      
      {isMobile ? (
        <MobileHomePage onStartClick={handleStartClick} onLearnMoreClick={handleLearnMoreClick} />
      ) : (
        <DesktopHomePage onStartClick={handleStartClick} onLearnMoreClick={handleLearnMoreClick} />
      )}
    </>
  );
}
