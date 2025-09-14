'use client';

import { useProfile } from '@/contexts/ProfileProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMediaQuery } from '@/hooks';
import MobileGameMatePage from '@/components/mobile/MobileGameMatePage';
import DesktopGameMatePage from '@/components/desktop/DesktopGameMatePage';

export default function GameMatePage() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    // 로딩이 완료된 후에만 역할 확인
    if (!isLoading && profile) {
      // NONE 역할 사용자는 프로필 등록 페이지로 리다이렉트
      if (profile.role?.name === 'NONE') {
        router.push('/');
        return;
      }
    }
  }, [profile, isLoading, router]);

  // 로딩 중이거나 프로필이 없는 경우
  if (isLoading || !profile) {
    return (
      <div className="h-full bg-cyber-black-200 flex items-center justify-center overflow-hidden">
        <div className="text-cyber-gray">로딩 중...</div>
      </div>
    );
  }

  // NONE 역할 사용자는 리다이렉트되므로 여기까지 오지 않음
  if (profile.role?.name === 'NONE') {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <MobileGameMatePage userId={profile?.userId || ''} />
      ) : (
        <DesktopGameMatePage userId={profile?.userId || ''} />
      )}
    </>
  );
}
