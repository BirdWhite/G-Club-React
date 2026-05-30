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
    <div className="max-w-4xl mx-auto page-content-padding py-12 space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-extrabold text-foreground">게임 메이트 글 작성</h1>
      </div>
      <GamePostForm />
    </div>
  );
}
