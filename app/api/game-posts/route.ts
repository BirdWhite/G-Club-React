import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const status = searchParams.get('status'); // 'open' or 'closed'
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // 필터 조건 설정
    const where: any = {};
    
    if (gameId) {
      where.gameId = gameId;
    }
    
    if (status === 'recruiting') {
      // 모집 중 (정원 미달 또는 마감)
      where.OR = [
        { status: 'OPEN' },
        { status: 'FULL' }
      ];
    } else if (status === 'completed') {
      // 완료됨
      where.status = 'COMPLETED';
    }

    // 모집글 목록 조회 (최신순)
    const [posts, total] = await Promise.all([
      prisma.gamePost.findMany({
        where,
        include: {
          game: true,
          author: {
            include: {
              profile: {
                select: {
                  profileImage: true
                }
              }
            }
          },
          _count: {
            select: {
              participants: {
                where: { isReserve: false }
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.gamePost.count({ where }),
    ]);

    // 작성자 프로필 이미지 처리
    const postsWithFullImageUrl = posts.map(post => {
      // 이미지 URL 생성 (도메인 추가)
      const imageUrl = post.author?.image 
        ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${post.author.image}`
        : null;

      return {
        ...post,
        author: post.author ? {
          ...post.author,
          image: imageUrl
        } : null
      };
    });

    return NextResponse.json({
      data: postsWithFullImageUrl,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('모집글 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '모집글 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { title, content, gameId, maxPlayers, startTime } = await request.json();

    // 필수 필드 검증
    if (!title || !content || !gameId || !maxPlayers || !startTime) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 최대 인원수 검증 (2~100명)
    if (maxPlayers < 2 || maxPlayers > 100) {
      return NextResponse.json(
        { error: '인원수는 2명 이상 100명 이하로 설정해주세요.' },
        { status: 400 }
      );
    }

    // 모집글 생성
    const gamePost = await prisma.$transaction(async (prisma) => {
      // 모집글 생성
      const post = await prisma.gamePost.create({
        data: {
          title,
          content,
          gameId,
          maxPlayers,
          startTime: new Date(startTime),
          authorId: session.user.id,
        },
      });

      // 모집자 본인을 참여자로 추가
      await prisma.gameParticipant.create({
        data: {
          gamePostId: post.id,
          userId: session.user.id,
          isLeader: true,
          isReserve: false,
        },
      });

      return post;
    });

    return NextResponse.json(gamePost, { status: 201 });
  } catch (error) {
    console.error('모집글 생성 오류:', error);
    return NextResponse.json(
      { error: '모집글을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
