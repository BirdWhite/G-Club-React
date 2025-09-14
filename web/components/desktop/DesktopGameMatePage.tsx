'use client';

import DesktopGamePostList from '@/app/game-mate/components/desktop/DesktopGamePostList';

interface DesktopGameMatePageProps {
  userId: string;
}

export default function DesktopGameMatePage({ userId }: DesktopGameMatePageProps) {
  return (
    <div className="h-full bg-cyber-black-200 overflow-y-auto scrollbar-visible">
      {/* 데스크톱용 헤더 */}
      <div className="bg-cyber-black-100 border-b border-cyber-black-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-cyber-gray">게임메이트 찾기</h1>
          <p className="mt-1 text-sm text-cyber-gray/60">함께 게임을 즐길 파티원을 찾아보세요!</p>
        </div>
      </div>
      
      {/* 데스크톱용 콘텐츠 */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <DesktopGamePostList userId={userId} />
      </main>
    </div>
  );
}
