import { notFound, redirect } from 'next/navigation';
import { Game, GamePost } from '@/types/models';
import { GamePostForm } from '@/components/game-mate/GamePostForm';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { headers } from 'next/headers';

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

export default async function EditGamePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // 모바일 기기 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  const [post, games, user] = await Promise.all([
    getPost(id),
    getGames(),
    getCurrentUser()
  ]);

  if (!post || post.author.userId !== user?.id) {
    notFound();
  }

  // 모바일인 경우 모바일 페이지로 리다이렉트
  if (isMobile) {
    redirect(`/game-mate/${id}/edit/mobile`);
  }

  return (
    <div className="min-h-screen bg-cyber-black-200 max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-cyber-gray">모집글 수정하기</h1>
        <p className="mt-2 text-sm text-cyber-gray/60">게시글 내용을 수정하고 다시 파티원을 모집해보세요.</p>
      </div>
      <div className="bg-cyber-black-200-200 border border-cyber-black-300 shadow-lg rounded-lg p-6 sm:p-8">
        <GamePostForm games={games} initialData={post} />
      </div>
    </div>
  );
}