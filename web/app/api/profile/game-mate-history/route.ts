import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 사용자가 참여한 게임메이트 글 조회 (ACTIVE와 LEFT 상태 모두 포함)
    const gamePosts = await prisma.gamePost.findMany({
      where: {
        status: { not: 'DELETED' },
        participants: {
          some: {
            userId: user.id,
            status: { in: ['ACTIVE', 'LEFT_EARLY'] }
          }
        }
      },
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
          select: {
            id: true,
            userId: true,
            participantType: true,
            guestName: true,
            joinedAt: true,
            status: true,
          },
        },
        waitingList: {
          where: {
            status: { not: 'CANCELED' }
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc' // 최신 게임부터 표시
      },
      skip: offset,
      take: limit,
    });

    // 총 개수 조회 (ACTIVE와 LEFT 상태 모두 포함)
    const total = await prisma.gamePost.count({
      where: {
        status: { not: 'DELETED' },
        participants: {
          some: {
            userId: user.id,
            status: { in: ['ACTIVE', 'LEFT_EARLY'] }
          }
        }
      },
    });

    // 응답 데이터 구성
    const posts = gamePosts.map(post => {
      const activeParticipantsCount = post.participants.filter(p => p.status === 'ACTIVE').length;
      const isFull = activeParticipantsCount >= post.maxParticipants;
      
      // 현재 사용자의 참여 상태 찾기
      const userParticipant = post.participants.find(p => p.userId === user.id);
      const participantStatus = userParticipant?.status as 'ACTIVE' | 'LEFT_EARLY' | undefined;
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        startTime: post.startTime.toISOString(),
        maxParticipants: post.maxParticipants,
        status: post.status,
        isFull: isFull,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        game: post.game,
        author: post.author,
        _count: {
          participants: activeParticipantsCount,
          waitingList: post.waitingList.length,
        },
        isOwner: post.authorId === user.id,
        isParticipating: participantStatus === 'ACTIVE',
        isWaiting: false, // 참여한 글은 대기자가 아니므로 false
        participantStatus: participantStatus,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });

  } catch (error) {
    console.error('게임메이트 내역 조회 오류:', error);
    return NextResponse.json(
      { error: '게임메이트 내역을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
