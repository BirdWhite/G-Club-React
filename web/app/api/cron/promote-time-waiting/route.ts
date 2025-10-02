import { NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';

// TIME_WAITING 상태의 예비 참가자를 WAITING으로 승격하는 cron job
export async function POST() {
  try {
    console.log('시간 예비 참가자 승격 작업 시작...');
    
    const currentTime = new Date();
    console.log(`현재 시간: ${currentTime.toISOString()}`);
    
    // availableTime이 현재 시간보다 이전인 TIME_WAITING 상태의 예비 참가자들을 찾음
    const timeWaitingParticipants = await prisma.waitingParticipant.findMany({
      where: {
        status: 'TIME_WAITING',
        availableTime: {
          lte: currentTime.toISOString() // availableTime이 현재 시간보다 이전이거나 같음
        }
      },
      include: {
        gamePost: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    console.log(`승격 대상 TIME_WAITING 참가자 ${timeWaitingParticipants.length}명 발견`);

    if (timeWaitingParticipants.length === 0) {
      return NextResponse.json({ 
        message: '승격할 TIME_WAITING 참가자가 없습니다.',
        promotedCount: 0
      });
    }

    // 각 참가자에 대해 승격 처리
    const promotedParticipants = [];
    
    for (const participant of timeWaitingParticipants) {
      try {
        // TIME_WAITING을 WAITING으로 변경
        await prisma.waitingParticipant.update({
          where: { id: participant.id },
          data: { status: 'WAITING' }
        });

        promotedParticipants.push({
          id: participant.id,
          userId: participant.userId,
          gamePostId: participant.gamePostId,
          gamePostTitle: participant.gamePost.title,
          availableTime: participant.availableTime
        });

        console.log(`참가자 ${participant.userId} 승격 완료 (게임: ${participant.gamePost.title})`);
      } catch (error) {
        console.error(`참가자 ${participant.id} 승격 실패:`, error);
      }
    }

    console.log(`총 ${promotedParticipants.length}명의 TIME_WAITING 참가자를 WAITING으로 승격했습니다.`);

    return NextResponse.json({ 
      message: `TIME_WAITING 참가자 ${promotedParticipants.length}명을 WAITING으로 승격했습니다.`,
      promotedCount: promotedParticipants.length,
      promotedParticipants
    });

  } catch (error) {
    console.error('시간 예비 참가자 승격 작업 오류:', error);
    return NextResponse.json(
      { error: '시간 예비 참가자 승격 작업 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

