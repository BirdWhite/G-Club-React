'use client';

import { useProfile } from '@/contexts/ProfileProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import GamePostList from '@/app/game-mate/components/GamePostList';

export default function GameMatePage() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();

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
    <div className="h-full bg-cyber-black-200 overflow-y-auto scrollbar-visible">
      <div className="bg-cyber-black-100 border-b border-cyber-black-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-cyber-gray">게임메이트 찾기</h1>
          <p className="mt-1 text-sm text-cyber-gray/60">함께 게임을 즐길 파티원을 찾아보세요!</p>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <GamePostList userId={profile?.userId} />
      </main>
    </div>
  );
}
