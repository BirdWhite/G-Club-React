'use client';

import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import { useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, error } = useProfile();

  useEffect(() => {
    if (isLoading) return;
    
    if (error || !profile) {
      // 프로필이 없거나 오류가 있는 경우 로그인 페이지로
      router.push('/auth/login');
      return;
    }

    // 현재 사용자의 프로필 페이지로 리다이렉트
    router.push(`/profile/${profile.userId}`);
  }, [profile, isLoading, error, router]); // router 의존성 복구

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 리다이렉트 중
  return null;
}
