import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { notificationService } from '@/lib/notifications/notificationService';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const status = searchParams.get('status');

    // 게시글 조회 조건 설정 (DELETED 상태 제외)
    const where: Record<string, unknown> = {
      status: { not: 'DELETED' } // 삭제된 게시글 제외
    };

    // 게임 ID 필터링
    if (gameId && gameId !== 'all') {
      where.gameId = gameId;
    }

    // 상태 필터링
    if (status) {
      if (status === 'recruiting') {
        // 모집 중 (OPEN, FULL, IN_PROGRESS)
        where.AND = [
          { status: { not: 'DELETED' } },
          {
            OR: [
              { status: 'OPEN' },
              { status: 'FULL' },
              { status: 'IN_PROGRESS' },
            ]
          }
        ];
      } else if (status === 'completed_expired') {
        // 완료&만료됨 (COMPLETED 또는 EXPIRED)
        where.AND = [
          { status: { not: 'DELETED' } },
          {
            OR: [
              { status: 'COMPLETED' },
              { status: 'EXPIRED' },
            ]
          }
        ];
      } else if (['OPEN', 'FULL', 'COMPLETED', 'EXPIRED'].includes(status)) {
        // 특정 상태로 필터링
        where.AND = [
          { status: { not: 'DELETED' } },
          { status: status as 'OPEN' | 'FULL' | 'COMPLETED' | 'EXPIRED' }
        ];
      }
    }

    // 게시글 조회 (최신순으로 정렬)
    const posts = await prisma.gamePost.findMany({
      where,
      include: {
        game: {
          select: {
            name: true,
            iconUrl: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        participants: true, // _count 대신 전체 참여자 목록 포함
        waitingList: true,  // _count 대신 전체 대기자 목록 포함
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 응답 데이터 형식 변환
    const responseData = posts.map((post) => ({
      ...post,
      // _count를 클라이언트에서 계산할 수 있도록 participants와 waitingList 길이를 기반으로 생성
      _count: {
        participants: post.participants.length,
        waitingList: post.waitingList.length,
      },
      startTime: post.startTime.toISOString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('게시글 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '게시글 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { title, content, gameId, maxParticipants, startTime, participants = [] } = await request.json();

    if (!title || !content || !gameId || !startTime || !maxParticipants) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 최대 인원수 검증 (2~100명)
    if (maxParticipants < 2 || maxParticipants > 100) {
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
          maxParticipants,
          startTime: new Date(startTime),
          authorId: user.id,
        },
      });

      // 참여자들 추가 (작성자 본인 포함)
      const addedUserIds = new Set<string>();
      
      for (const participant of participants) {
        if (participant.userId && participant.userId.trim()) {
          // 중복 체크
          if (addedUserIds.has(participant.userId)) {
            continue;
          }
          
          // 기존 사용자 확인
          const existingUser = await prisma.userProfile.findUnique({
            where: { userId: participant.userId }
          });

          if (existingUser) {
            try {
              // 기존 사용자를 참여자로 추가
              await prisma.gameParticipant.create({
                data: {
                  gamePostId: post.id,
                  participantType: 'MEMBER',
                  userId: existingUser.userId,
                },
              });
              addedUserIds.add(participant.userId);
            } catch (error: unknown) {
              // 중복 오류는 무시 (이미 추가된 경우)
              if (error instanceof Error && 'code' in error && error.code !== 'P2002') {
                throw error;
              }
            }
          }
        } else if (participant.name && participant.name.trim()) {
          // 게스트 참여자 추가
          try {
            await prisma.gameParticipant.create({
              data: {
                gamePostId: post.id,
                participantType: 'GUEST',
                guestName: participant.name,
              },
            });
          } catch (error: unknown) {
            // 중복 오류는 무시 (이미 추가된 경우)
            if (error instanceof Error && 'code' in error && error.code !== 'P2002') {
              throw error;
            }
          }
        }
      }

      return post;
    });

    // 새 게임 포스트 알림 발송
    try {
      await notificationService.notifyNewGamePost(gamePost.id, user.id);
    } catch (notificationError) {
      console.error('새 게임 포스트 알림 발송 중 오류:', notificationError);
      // 알림 발송 실패는 메인 로직에 영향을 주지 않음
    }

    return NextResponse.json(gamePost, { status: 201 });
  } catch (error) {
    console.error('모집글 생성 오류:', error);
    return NextResponse.json(
      { error: '모집글을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
