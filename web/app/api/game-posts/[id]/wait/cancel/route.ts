import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 현재 사용자의 예비 신청 취소
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const userId = user.id;

  try {
    const { id: gamePostId } = await params;
    
    // 현재 사용자의 예비 신청 찾기
    const waitingParticipant = await prisma.waitingParticipant.findFirst({
      where: {
        gamePostId,
        userId,
        status: {
          in: ['WAITING', 'TIME_WAITING']
        }
      }
    });

    if (!waitingParticipant) {
      return NextResponse.json({ error: '취소할 예비 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 예비 신청 상태를 CANCELED로 변경
    await prisma.waitingParticipant.update({
      where: { id: waitingParticipant.id },
      data: { status: 'CANCELED' }
    });

    return NextResponse.json({ message: '예비 참여가 취소되었습니다.' });
  } catch (error) {
    console.error('예비 참여 취소 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
