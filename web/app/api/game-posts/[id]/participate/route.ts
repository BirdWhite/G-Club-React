import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import prisma from '@/lib/prisma';

// 참여 신청
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  
  const userId = user.id;

  try {
    const { id: gamePostId } = params;

    const post = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        participants: {
          select: { userId: true }
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (post.authorId === userId) {
      return NextResponse.json({ error: '자신이 생성한 모집글에는 참여할 수 없습니다.' }, { status: 400 });
    }
    if (post.status !== 'OPEN') {
      return NextResponse.json({ error: '현재 모집 중인 글이 아닙니다.' }, { status: 400 });
    }
    
    const isAlreadyParticipant = post.participants.some(p => p.userId === userId);
    if (isAlreadyParticipant) {
        return NextResponse.json({ error: '이미 참여하고 있는 모집글입니다.' }, { status: 400 });
    }

    const currentParticipantsCount = post.participants.length;
    if (currentParticipantsCount >= post.maxParticipants) {
      return NextResponse.json({ error: '인원이 모두 찼습니다. 대기열에 등록하시겠습니까?' }, { status: 409, headers: { 'X-Requires-Waiting': 'true' } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.gameParticipant.create({
        data: {
          gamePostId,
          userId,
        },
      });

      // 참여 후 인원이 가득 찼다면 상태를 FULL로 변경
      if (currentParticipantsCount + 1 === post.maxParticipants) {
        await tx.gamePost.update({
          where: { id: gamePostId },
          data: { status: 'FULL' },
        });
      }
    });
    
    return NextResponse.json({ message: '참여가 완료되었습니다.' });
  } catch (error) {
    console.error('참여 처리 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 참여 취소
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const userId = user.id;

  try {
    const { id: gamePostId } = params;

    const participation = await prisma.gameParticipant.findUnique({
      where: {
        gamePostId_userId: {
          gamePostId,
          userId,
        },
      },
      include: {
        gamePost: true,
      },
    });

    if (!participation) {
      return NextResponse.json({ error: '참여 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 방장은 참여를 취소할 수 없음 (게시글을 삭제해야 함)
    if (participation.gamePost.authorId === userId) {
        return NextResponse.json({ error: '방장은 참여를 취소할 수 없습니다. 게시글을 삭제해주세요.' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. 참여자 목록에서 삭제
      await tx.gameParticipant.delete({
        where: { id: participation.id },
      });

      // 2. 대기열에서 첫 번째 대기자 확인
      const firstInWaiting = await tx.waitingParticipant.findFirst({
        where: { gamePostId },
        orderBy: { requestedAt: 'asc' },
      });

      let newStatus = participation.gamePost.status;

      if (firstInWaiting) {
        // 3. 대기자를 참여자로 이동
        await tx.gameParticipant.create({
          data: {
            gamePostId,
            userId: firstInWaiting.userId,
          },
        });
        await tx.waitingParticipant.delete({
          where: { id: firstInWaiting.id },
        });
        // 대기자가 들어와도 자리가 그대로 꽉 차 있으므로 상태는 FULL 유지
        newStatus = 'FULL';
      } else {
        // 대기자가 없으면 빈자리가 생겼으므로 OPEN으로 변경
        newStatus = 'OPEN';
      }

      // 4. 게시글 상태 업데이트 (필요한 경우)
      if (newStatus !== participation.gamePost.status) {
        await tx.gamePost.update({
          where: { id: gamePostId },
          data: { status: newStatus },
        });
      }
    });

    return NextResponse.json({ message: '참여가 취소되었습니다.' });
  } catch (error) {
    console.error('참여 취소 처리 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
