import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { promoteWaitingParticipant } from '@/lib/database/gameParticipantUtils';

// 예비 참여자가 참여 제안을 승낙
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waitingId: string }> }
) {
  try {
    const { id: gamePostId, waitingId } = await params;
    
    // 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 예비 참여자 정보 조회
    const waitingParticipant = await prisma.waitingParticipant.findUnique({
      where: { id: waitingId },
      include: {
        gamePost: {
          include: {
            participants: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    if (!waitingParticipant) {
      return NextResponse.json({ error: '예비 참여자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 본인만 승낙할 수 있음
    if (waitingParticipant.userId !== user.id) {
      return NextResponse.json({ error: '본인의 참여 제안만 승낙할 수 있습니다.' }, { status: 403 });
    }

    // INVITED 상태인지 확인
    if (waitingParticipant.status !== 'INVITED') {
      return NextResponse.json({ error: '참여 제안이 아닙니다.' }, { status: 400 });
    }

    // 게임이 진행 중인지 확인
    if (waitingParticipant.gamePost.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: '게임이 진행 중이 아닙니다.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 예비 참여자를 정식 참여자로 승격
      await promoteWaitingParticipant(tx, gamePostId, waitingParticipant.userId);
      
      // 예비 참여자 목록에서 제거
      await tx.waitingParticipant.delete({
        where: { id: waitingId },
      });

      // 게임글의 isFull 상태 업데이트
      const gamePost = await tx.gamePost.findUnique({
        where: { id: gamePostId },
        include: {
          participants: {
            where: { status: 'ACTIVE' }
          }
        }
      });

      if (gamePost) {
        const isFull = gamePost.participants.length >= gamePost.maxParticipants;
        await tx.gamePost.update({
          where: { id: gamePostId },
          data: { isFull }
        });
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: '게임 참여가 승인되었습니다.' 
    });

  } catch (error) {
    console.error('참여 승낙 처리 오류:', error);
    return NextResponse.json(
      { error: '참여 승낙 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
