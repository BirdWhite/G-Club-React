'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GamePostForm } from '@/components/game-mate/GamePostForm';
import { MobileGamePostForm } from '@/components/game-mate/mobile/MobileGamePostForm';

export default function NewGamePostPage() {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return <MobileGamePostForm />;
  }

  return (
    <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-12">
        <div className="w-full max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">게임메이트 모집하기</h1>
        <p className="mt-2 text-sm text-muted-foreground">함께 게임을 즐길 파티원을 모집해보세요!</p>
      </div>
      <div className="bg-card border border-border shadow-lg rounded-lg p-6 sm:p-8">
        <GamePostForm />
      </div>
        </div>
      </div>
  );
}
