import { getCurrentUser } from '@/lib/database/supabase';
import { GamePost } from '@/types/models';
import { notFound } from 'next/navigation';
import GamePostDetailClient from './components/GamePostDetailClient';
import prisma from '@/lib/database/prisma';

async function getPost(id: string): Promise<GamePost | null> {
  try {
    const post = await prisma.gamePost.findUnique({
      where: { id },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            iconUrl: true,
          },
        },
        author: {
          select: {
            id: true,
            userId: true,
            name: true,
            image: true,
          },
        },
        participants: {
          orderBy: { joinedAt: 'asc' },
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
        },
        waitingList: {
          orderBy: { requestedAt: 'asc' },
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
        },
      },
    });

    if (!post) return null;

    const postWithCounts = {
      ...post,
      _count: {
        participants: post.participants.length,
        waitingList: post.waitingList.length,
      },
    };

    return postWithCounts as any as GamePost;

  } catch (error) {
    console.error(`Failed to fetch post ${id} from DB:`, error);
    return null;
  }
}

export default async function GamePostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  const user = await getCurrentUser();

  if (!post) {
    notFound();
  }

  const userId = user?.id;
  const isOwner = userId === post.author.userId;
  const isParticipating = post.participants?.some(p => p.userId === userId);
  const isWaiting = post.waitingList?.some(w => w.userId === userId);

  const initialPostState = {
    ...post,
    isOwner,
    isParticipating,
    isWaiting,
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
      <GamePostDetailClient initialPost={initialPostState} userId={userId} />
    </div>
  );
}
