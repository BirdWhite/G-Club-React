'use client';

import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import { useEffect, useState, use } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { redirect } from 'next/navigation';
import { MobileProfileMenu } from '@/components/mobile/MobileProfileMenu';
import { DesktopProfilePage } from '@/components/desktop/DesktopProfilePage';
import type { FullUserProfile } from '@/lib/user';

interface ProfilePageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const { profile: currentUserProfile, isLoading: currentUserLoading, error: currentUserError } = useProfile();
  const [targetProfile, setTargetProfile] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const { userId } = use(params);
  const isOwnProfile = currentUserProfile?.userId === userId;

  // 프로필 데이터 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      
      try {
        if (isOwnProfile && currentUserProfile) {
          // 자신의 프로필인 경우 현재 프로필 데이터 사용
          setTargetProfile(currentUserProfile);
        } else {
          // 다른 사용자의 프로필인 경우 API에서 조회
          const response = await fetch(`/api/profile/${userId}`);
          if (response.ok) {
            const data = await response.json();
            setTargetProfile(data.profile);
          } else if (response.status === 401) {
            // 인증되지 않은 사용자인 경우 로그인 페이지로 리다이렉트
            router.push('/auth/login');
          } else {
            console.error('프로필을 불러올 수 없습니다.');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('프로필 로드 중 오류:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserLoading) return; // 현재 사용자 프로필 로딩 중이면 대기
    
    loadProfile();
  }, [userId, isOwnProfile, currentUserProfile, currentUserLoading, router]);

  if (isLoading || currentUserLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentUserError && !isOwnProfile) {
    // 현재 사용자가 로그인하지 않은 상태에서 다른 사용자 프로필 조회 시
    router.push('/auth/login');
    return null;
  }
  
  if (!targetProfile) {
    router.push('/');
    return null;
  }

  // NONE 역할 사용자는 자신의 프로필이 아닌 경우에만 대기 페이지 표시
  if ((targetProfile as { role?: { name?: string } })?.role?.name === 'NONE' && !isOwnProfile) {
    redirect('/auth/pending');
  }


  // 모바일에서는 MobileProfileMenu 컴포넌트 사용 (자신의 프로필일 때만)
  if (isOwnProfile) {
    return (
      <>
        {isMobile ? (
          <MobileProfileMenu profile={targetProfile as FullUserProfile} />
        ) : (
          <DesktopProfilePage targetProfile={targetProfile as FullUserProfile} isOwnProfile={isOwnProfile} />
        )}
      </>
    );
  }

  return (
    <>
      {isMobile ? (
        <div>모바일에서는 다른 사용자 프로필을 볼 수 없습니다.</div>
      ) : (
        <DesktopProfilePage targetProfile={targetProfile as FullUserProfile} isOwnProfile={isOwnProfile} />
      )}
    </>
  );
}
