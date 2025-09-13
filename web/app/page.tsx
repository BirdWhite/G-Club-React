'use client';

import { useProfileCheck } from '@/hooks';
import { useProfile } from '@/contexts/ProfileProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { HeroSection } from '@/components/HeroSection';
import { MembershipPendingPage } from '@/components/MembershipPendingPage';

export default function Home() {
  // 프로필 체크 로직 - 세션 확인 및 프로필 존재 여부에 따른 리다이렉션
  const { isLoading } = useProfileCheck();
  const { profile } = useProfile();

  // 시작하기 버튼 클릭 이벤트 핸들러
  const handleStartClick = () => {
    // 시작하기 버튼 클릭 로직
    console.log('시작하기 클릭됨');
  };

  // 더 알아보기 버튼 클릭 이벤트 핸들러
  const handleLearnMoreClick = () => {
    // 더 알아보기 버튼 클릭 로직
    console.log('더 알아보기 클릭됨');
  };

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
    <div className="h-full bg-cyber-black-200">
      <HeroSection onStartClick={handleStartClick} onLearnMoreClick={handleLearnMoreClick} />
    </div>
  );
}
