import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 예비 참여자가 대기 취소
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waitingId: string }> }
) {
  try {
    const { waitingId } = await params;
    
    // 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 예비 참여자 정보 조회
    const waitingParticipant = await prisma.waitingParticipant.findUnique({
      where: { id: waitingId },
      include: {
        gamePost: true
      }
    });

    if (!waitingParticipant) {
      return NextResponse.json({ error: '예비 참여자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 본인만 취소할 수 있음
    if (waitingParticipant.userId !== user.id) {
      return NextResponse.json({ error: '본인의 예비 참여만 취소할 수 있습니다.' }, { status: 403 });
    }

    // WAITING 또는 INVITED 상태인지 확인
    if (waitingParticipant.status !== 'WAITING' && waitingParticipant.status !== 'INVITED') {
      return NextResponse.json({ error: '대기 중이거나 초대받은 예비 참여만 취소할 수 있습니다.' }, { status: 400 });
    }

    // 예비 참여자 상태를 CANCELED로 변경
    await prisma.waitingParticipant.update({
      where: { id: waitingId },
      data: { status: 'CANCELED' },
    });

    return NextResponse.json({ 
      success: true, 
      message: '예비 참여가 취소되었습니다.' 
    });

  } catch (error) {
    console.error('예비 참여 취소 처리 오류:', error);
    return NextResponse.json(
      { error: '예비 참여 취소 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
