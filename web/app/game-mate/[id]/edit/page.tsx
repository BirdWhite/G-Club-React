import { notFound } from 'next/navigation';
import { Game, GamePost } from '@/types/models';
import GamePostForm from '../../components/GamePostForm';
import { getCurrentUser } from '@/lib/supabase/auth';
import prisma from '@/lib/prisma';

async function getPost(id: string): Promise<GamePost | null> {
    try {
      const post = await prisma.gamePost.findUnique({
        where: { id },
        include: {
            game: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                }
            },
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        }
                    }
                }
            },
            waitingList: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        }
                    }
                }
            },
            _count: {
                select: {
                    participants: true,
                    waitingList: true,
                }
            }
        }
      });
      if (!post) return null;

      // Prisma의 Decimal 타입을 JsonValue로 캐스팅해야 할 수 있음.
      // 현재 스키마에서는 content가 Json이므로 괜찮을 것으로 예상.
      // 관계 필드 타입들도 호환되는지 확인 필요.
      // Prisma가 반환하는 타입과 우리 모델 타입이 다를 경우 mapping 필요.
      // 지금은 일단 타입이 호환된다고 가정.
      return post as any as GamePost;

    } catch (error) {
      console.error(`Failed to fetch post ${id} from DB:`, error);
      return null;
    }
}
  
async function getGames(): Promise<Game[]> {
    try {
        const games = await prisma.game.findMany({
          orderBy: { name: 'asc' }
        });
        return games;
    } catch (error) {
        console.error('Failed to fetch games from DB:', error);
        return [];
    }
}

export default async function EditGamePostPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [post, games, user] = await Promise.all([
    getPost(id),
    getGames(),
    getCurrentUser()
  ]);

  if (!post || post.author.id !== user?.id) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">모집글 수정하기</h1>
        <p className="mt-2 text-sm text-gray-600">게시글 내용을 수정하고 다시 파티원을 모집해보세요.</p>
      </div>
      <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <GamePostForm games={games} initialData={post} />
      </div>
    </div>
  );
}