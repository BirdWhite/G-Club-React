import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

// 게임 참여/취소
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }
  
  // TypeScript에게 session이 null이 아님을 보장
  const userId = session.user.id;

  try {
    const { id: postId } = params;
    const { action } = await request.json(); // 'join' 또는 'leave'

    // 모집글 조회
    const post = await prisma.gamePost.findUnique({
      where: { id: postId },
      include: {
        participants: {
          where: { userId: session.user.id },
        },
        _count: {
          select: {
            participants: {
              where: { isWaiting: false }
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 마감된 모집글인지 확인
    if (post.isClosed) {
      return NextResponse.json(
        { error: '이미 마감된 모집글입니다.' },
        { status: 400 }
      );
    }

    const existingParticipation = post.participants[0];
    const currentParticipants = post._count.participants;

    if (action === 'join') {
      // 이미 참여 중인 경우
      if (existingParticipation) {
        return NextResponse.json(
          { error: '이미 참여 중입니다.' },
          { status: 400 }
        );
      }

      // 정원이 가득 찼는지 확인
      if (currentParticipants >= post.maxPlayers) {
        // 대기자로 참여
        await prisma.gameParticipant.create({
          data: {
            gamePostId: postId,
            userId: session.user.id,
            isLeader: false,
            isWaiting: true,
          },
        });

        return NextResponse.json({
          message: '대기자로 등록되었습니다.',
          isWaiting: true,
        });
      } else {
        // 정상 참여
        await prisma.gameParticipant.create({
          data: {
            gamePostId: postId,
            userId: session.user.id,
            isLeader: false,
            isWaiting: false,
          },
        });

        return NextResponse.json({
          message: '참여가 완료되었습니다.',
          isWaiting: false,
        });
      }
    } else if (action === 'leave') {
      // 참여하지 않은 경우
      if (!existingParticipation) {
        return NextResponse.json(
          { error: '참여 중인 모집글이 아닙니다.' },
          { status: 400 }
        );
      }

      // 방장인 경우 권한 이전 로직 추가
      if (existingParticipation.isLeader) {
        // 다음 참여자 찾기 (대기자 제외)
        const nextLeader = await prisma.gameParticipant.findFirst({
          where: {
            gamePostId: postId,
            userId: { not: userId }, // 현재 방장 제외
            isWaiting: false, // 대기자 제외
          },
          orderBy: { joinedAt: 'asc' }, // 가장 먼저 참여한 사람
        });

        // 다음 방장이 있으면 권한 이전
        if (nextLeader) {
          await prisma.gameParticipant.update({
            where: { id: nextLeader.id },
            data: { isLeader: true },
          });
        }
      }

      // 참여 취소
      await prisma.gameParticipant.delete({
        where: { id: existingParticipation.id },
      });

      // 대기자가 있는 경우 첫 번째 대기자를 참여자로 변경
      if (currentParticipants <= post.maxPlayers) {
        const firstWaiting = await prisma.gameParticipant.findFirst({
          where: {
            gamePostId: postId,
            isWaiting: true,
          },
          orderBy: { joinedAt: 'asc' },
        });

        if (firstWaiting) {
          await prisma.gameParticipant.update({
            where: { id: firstWaiting.id },
            data: { isWaiting: false },
          });

          // TODO: 알림 전송 (웹소켓 또는 알림 시스템 연동)
        }
      }

      return NextResponse.json({ message: '참여가 취소되었습니다.' });
    } else {
      return NextResponse.json(
        { error: '잘못된 요청입니다.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('참여 처리 오류:', error);
    return NextResponse.json(
      { error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
