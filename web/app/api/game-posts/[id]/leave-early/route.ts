import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { autoPromoteFirstWaitingParticipant, inviteAllWaitingParticipants } from '@/lib/database/gameParticipantUtils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gamePostId } = await params;
    
    // 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문에서 participantId 확인 (작성자가 다른 참여자를 중도 퇴장 처리할 때 사용)
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch {
      // 요청 본문이 없으면 현재 사용자 본인 중도 퇴장
    }

    const { participantId } = requestBody as { participantId?: string };

    // 게임글과 참여자 정보 조회
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        participants: {
          where: participantId 
            ? { id: participantId, status: 'ACTIVE' } // 특정 참여자 조회
            : { userId: user.id, status: 'ACTIVE' }   // 현재 사용자 조회
        }
      }
    });

    if (!gamePost) {
      return NextResponse.json({ error: '게임글을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (gamePost.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: '게임이 진행 중일 때만 중도 퇴장할 수 있습니다.' }, { status: 400 });
    }

    const participation = gamePost.participants[0];
    if (!participation) {
      return NextResponse.json({ error: '참여자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (participantId) {
      // 작성자가 다른 참여자를 중도 퇴장 처리하는 경우
      if (gamePost.authorId !== user.id) {
        return NextResponse.json({ error: '다른 참여자를 중도 퇴장 처리할 권한이 없습니다.' }, { status: 403 });
      }
    } else {
      // 본인 중도 퇴장인 경우
      if (participation.userId !== user.id) {
        return NextResponse.json({ error: '본인만 중도 퇴장할 수 있습니다.' }, { status: 403 });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 참여자 상태를 LEFT_EARLY로 변경
      await tx.gameParticipant.update({
        where: { id: participation.id },
        data: {
          status: 'LEFT_EARLY',
          leftAt: new Date(),
        },
      });

      // 게임 중이 아닐 때만 예비 참가자 자동 승격
      if (gamePost.status !== 'IN_PROGRESS') {
        await autoPromoteFirstWaitingParticipant(tx, gamePostId);
      } else {
        // 게임 중일 때는 모든 WAITING 상태 예비 참가자에게 참여 제안
        await inviteAllWaitingParticipants(tx, gamePostId);
      }

      // isFull 상태 업데이트 (참여자가 줄어들었으므로 false로 설정)
      await tx.gamePost.update({
        where: { id: gamePostId },
        data: { isFull: false },
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: '중도 퇴장 처리되었습니다.' 
    });

  } catch (error) {
    console.error('중도 퇴장 처리 오류:', error);
    return NextResponse.json(
      { error: '중도 퇴장 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
