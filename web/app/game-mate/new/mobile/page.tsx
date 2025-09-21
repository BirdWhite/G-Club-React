import MobileGamePostForm from '../../components/mobile/MobileGamePostForm';
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

export default async function MobileNewGamePostPage() {
  const games = await getGames();

  return <MobileGamePostForm games={games} />;
}
