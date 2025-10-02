
import { Prisma } from '@prisma/client';

type PrismaTransaction = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * 예비 참여자를 정식 참여자로 승격하는 공통 함수
 * 기존에 중도 퇴장한 참여자가 있으면 재활성화하고, 없으면 새로 생성
 */
export async function promoteWaitingParticipant(
  tx: PrismaTransaction,
  gamePostId: string,
  userId: string
): Promise<void> {
  // 기존에 중도 퇴장한 참여자가 있는지 확인
  const existingParticipant = await tx.gameParticipant.findFirst({
    where: {
      gamePostId,
      userId,
      status: 'LEFT_EARLY'
    }
  });

  if (existingParticipant) {
    // 기존 중도 퇴장 참여자를 다시 활성화
    await tx.gameParticipant.update({
      where: { id: existingParticipant.id },
      data: {
        status: 'ACTIVE',
        leftAt: null, // 퇴장 시간 초기화
      },
    });
  } else {
    // 새로운 참여자로 추가
    await tx.gameParticipant.create({
      data: {
        gamePostId,
        userId,
        status: 'ACTIVE',
        participantType: 'MEMBER',
      },
    });
  }
}

/**
 * 첫 번째 예비 참여자를 자동으로 승격하는 함수
 * @param tx - Prisma 트랜잭션
 * @param gamePostId - 게임글 ID
 * @returns 승격된 사용자 ID 또는 null
 */
export async function autoPromoteFirstWaitingParticipant(
  tx: PrismaTransaction,
  gamePostId: string
): Promise<string | null> {
  // 대기열에서 첫 번째 대기자 확인 (WAITING 상태만, TIME_WAITING 제외)
  const firstInWaiting = await tx.waitingParticipant.findFirst({
    where: { 
      gamePostId,
      status: 'WAITING' // TIME_WAITING은 제외
    },
    orderBy: { requestedAt: 'asc' },
  });

  if (!firstInWaiting) {
    return null; // 대기자가 없으면 null 반환
  }

  // 예비 참여자를 정식 참여자로 승격
  await promoteWaitingParticipant(tx, gamePostId, firstInWaiting.userId);
  
  // 대기자 레코드 삭제
  await tx.waitingParticipant.delete({
    where: { id: firstInWaiting.id },
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

  return firstInWaiting.userId;
}

/**
 * 모든 WAITING 상태 예비 참여자에게 참여 제안을 보내는 함수 (게임 중일 때)
 * @param tx - Prisma 트랜잭션
 * @param gamePostId - 게임글 ID
 * @returns 제안을 받은 사용자 ID 배열
 */
export async function inviteAllWaitingParticipants(
  tx: PrismaTransaction,
  gamePostId: string
): Promise<string[]> {
  // 대기열에서 모든 WAITING 상태 대기자 확인 (TIME_WAITING 제외)
  const waitingParticipants = await tx.waitingParticipant.findMany({
    where: { 
      gamePostId,
      status: 'WAITING' // TIME_WAITING은 제외
    },
    orderBy: { requestedAt: 'asc' },
  });

  if (waitingParticipants.length === 0) {
    return []; // 대기자가 없으면 빈 배열 반환
  }

  // 모든 예비 참가자 상태를 INVITED로 변경 (참여 제안 상태)
  await tx.waitingParticipant.updateMany({
    where: { 
      gamePostId,
      status: 'WAITING'
    },
    data: { status: 'INVITED' },
  });

  return waitingParticipants.map(p => p.userId);
}

/**
 * 첫 번째 예비 참여자에게 참여 제안을 보내는 함수 (게임 중일 때) - 하위 호환성 유지
 * @param tx - Prisma 트랜잭션
 * @param gamePostId - 게임글 ID
 * @returns 제안을 받은 사용자 ID 또는 null
 */
export async function inviteFirstWaitingParticipant(
  tx: PrismaTransaction,
  gamePostId: string
): Promise<string | null> {
  const invitedUserIds = await inviteAllWaitingParticipants(tx, gamePostId);
  return invitedUserIds.length > 0 ? invitedUserIds[0] : null;
}
