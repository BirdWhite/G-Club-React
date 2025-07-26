import GamePostForm from '../components/GamePostForm';
import { Game } from '@/types/models';
import prisma from '@/lib/prisma';

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

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">게임메이트 모집하기</h1>
        <p className="mt-2 text-sm text-gray-600">함께 게임을 즐길 파티원을 모집해보세요!</p>
      </div>
      <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <GamePostForm games={games} />
      </div>
    </div>
  );
}
