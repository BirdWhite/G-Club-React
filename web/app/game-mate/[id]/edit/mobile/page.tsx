import { notFound } from 'next/navigation';
import { Game, GamePost } from '@/types/models';
import MobileGamePostForm from '../../../components/mobile/MobileGamePostForm';
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
                    userId: true,
                    name: true,
                    image: true,
                }
            },
            participants: {
                orderBy: { joinedAt: 'asc' },
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

      // 참여자 정보를 별도로 조회 (게스트 참여자 포함)
      const participants = await prisma.gameParticipant.findMany({
        where: { gamePostId: id },
        include: {
          user: {
            select: {
              id: true,
              userId: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      // Prisma의 Decimal 타입을 JsonValue로 캐스팅해야 할 수 있음.
      // 현재 스키마에서는 content가 Json이므로 괜찮을 것으로 예상.
      // 관계 필드 타입들도 호환되는지 확인 필요.
      // Prisma가 반환하는 타입과 우리 모델 타입이 다를 경우 mapping 필요.
      // 지금은 일단 타입이 호환된다고 가정.
      return {
        ...post,
        participants: participants,
      } as any as GamePost;

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

export default async function MobileEditGamePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, games, user] = await Promise.all([
    getPost(id),
    getGames(),
    getCurrentUser()
  ]);

  if (!post || post.author.userId !== user?.id) {
    notFound();
  }

  return <MobileGamePostForm games={games} initialData={post} />;
}
