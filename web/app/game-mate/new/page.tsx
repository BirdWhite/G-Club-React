import { GamePostForm } from '@/components/game-mate/GamePostForm';
import { Game } from '@/types/models';
import prisma from '@/lib/database/prisma';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

async function getGames(): Promise<Game[]> {
  try {
    const games = await prisma.game.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return games;
  } catch (error) {
    console.error('Failed to fetch games from DB:', error);
    return [];
  }
}

export default async function NewGamePostPage() {
  const games = await getGames();
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // 모바일 기기 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 모바일인 경우 모바일 페이지로 리다이렉트
  if (isMobile) {
    redirect('/game-mate/new/mobile');
  }

  return (
    <div className="min-h-screen bg-background max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">게임메이트 모집하기</h1>
        <p className="mt-2 text-sm text-muted-foreground">함께 게임을 즐길 파티원을 모집해보세요!</p>
      </div>
      <div className="bg-card border border-border shadow-lg rounded-lg p-6 sm:p-8">
        <GamePostForm games={games} />
      </div>
    </div>
  );
}
