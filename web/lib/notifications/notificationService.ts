import prisma from '@/lib/database/prisma';
import { sendPushNotificationInternal } from './pushNotifications';

export interface CreateNotificationData {
  type: string;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  senderId?: string;
  recipientId?: string;
  isGroupSend?: boolean;
  groupType?: string;
  groupFilter?: any;
  gamePostId?: string;
  scheduledAt?: Date;
  data?: any;
}

// 알림 생성 및 발송
export async function createAndSendNotification(notificationData: CreateNotificationData) {
  try {
    const {
      type,
      title,
      body,
      icon,
      actionUrl,
      priority = 'NORMAL',
      senderId,
      recipientId,
      isGroupSend = false,
      groupType,
      groupFilter,
      gamePostId,
      scheduledAt,
      data
    } = notificationData;

    // 알림 생성
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        body,
        icon,
        actionUrl,
        priority,
        senderId,
        recipientId: !isGroupSend ? recipientId : null,
        isGroupSend,
        groupType: isGroupSend ? groupType : null,
        groupFilter: isGroupSend ? groupFilter : null,
        gamePostId,
        scheduledAt,
        data,
        status: scheduledAt ? 'PENDING' : 'SENDING',
        sentAt: scheduledAt ? null : new Date()
      }
    });

    let targetUserIds: string[] = [];

    // 개별 발송
    if (!isGroupSend && recipientId) {
      targetUserIds = [recipientId];
      
      await prisma.notificationReceipt.create({
        data: {
          notificationId: notification.id,
          userId: recipientId
        }
      });
    }
    
    // 그룹 발송
    if (isGroupSend) {
      targetUserIds = await getTargetUserIds(groupType, groupFilter, gamePostId);
      
      if (targetUserIds.length > 0) {
        await prisma.notificationReceipt.createMany({
          data: targetUserIds.map(userId => ({
            notificationId: notification.id,
            userId
          })),
          skipDuplicates: true
        });
      }
    }

    // 푸시 알림 발송 (예약이 아닌 경우)
    if (!scheduledAt && targetUserIds.length > 0) {
      await sendPushNotificationToUsers(notification.id, targetUserIds, {
        title,
        body,
        icon,
        data: {
          notificationId: notification.id,
          actionUrl,
          ...data
        }
      });

      // 알림 상태 업데이트
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT' }
      });
    }

    return {
      success: true,
      notification,
      targetCount: targetUserIds.length
    };
  } catch (error) {
    console.error('알림 생성 및 발송 실패:', error);
    throw error;
  }
}

// 대상 사용자 ID 목록 조회
async function getTargetUserIds(
  groupType?: string, 
  groupFilter?: any, 
  gamePostId?: string
): Promise<string[]> {
  let targetUsers: string[] = [];

  switch (groupType) {
    case 'ALL_USERS':
      const allUsers = await prisma.userProfile.findMany({
        select: { userId: true }
      });
      targetUsers = allUsers.map(u => u.userId);
      break;
    
    case 'ROLE_BASED':
      if (groupFilter?.roleId) {
        const roleUsers = await prisma.userProfile.findMany({
          where: { roleId: groupFilter.roleId },
          select: { userId: true }
        });
        targetUsers = roleUsers.map(u => u.userId);
      }
      break;
    
    case 'GAME_PARTICIPANTS':
      if (gamePostId) {
        const participants = await prisma.gameParticipant.findMany({
          where: { gamePostId },
          select: { userId: true }
        });
        targetUsers = participants.map(p => p.userId!).filter(Boolean);
      }
      break;
    
    case 'WAITING_PARTICIPANTS':
      if (gamePostId) {
        const waitingParticipants = await prisma.waitingParticipant.findMany({
          where: { 
            gamePostId,
            status: 'WAITING'
          },
          select: { userId: true }
        });
        targetUsers = waitingParticipants.map(w => w.userId);
      }
      break;
  }

  return targetUsers;
}

// 다수 사용자에게 푸시 알림 발송
async function sendPushNotificationToUsers(
  notificationId: string,
  userIds: string[],
  pushData: {
    title: string;
    body: string;
    icon?: string;
    data?: any;
  }
) {
  try {
    // 사용자들의 푸시 구독 정보 조회
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: userIds },
        isEnabled: true
      }
    });

    // 각 구독에 대해 푸시 발송
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await sendPushNotificationInternal({
          userId: sub.userId,
          title: pushData.title,
          body: pushData.body,
          url: pushData.data?.actionUrl || '/',
          tag: 'notification'
        });

        // 푸시 발송 성공 기록
        await prisma.notificationReceipt.updateMany({
          where: {
            notificationId,
            userId: sub.userId
          },
          data: {
            pushSent: true,
            pushSentAt: new Date()
          }
        });
      } catch (error) {
        console.error(`푸시 발송 실패 (userId: ${sub.userId}):`, error);
        
        // 푸시 발송 실패 기록
        await prisma.notificationReceipt.updateMany({
          where: {
            notificationId,
            userId: sub.userId
          },
          data: {
            pushError: error instanceof Error ? error.message : '알 수 없는 오류'
          }
        });
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (error) {
    console.error('푸시 알림 발송 중 오류:', error);
  }
}

// 게임 포스트 관련 알림 발송 헬퍼 함수들
export const GamePostNotifications = {
  // 새 게임 포스트 생성 알림
  async notifyNewGamePost(gamePostId: string, authorId: string) {
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true,
        author: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'GAME_POST_NEW',
      title: `새로운 게임메이트 모집!`,
      body: `${gamePost.author.name}님이 ${gamePost.game?.name || gamePost.customGameName} 게임메이트를 모집합니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'NORMAL',
      senderId: authorId,
      isGroupSend: true,
      groupType: 'ALL_USERS',
      gamePostId
    });
  },

  // 게임 참여 승인 알림
  async notifyParticipantJoined(gamePostId: string, participantId: string) {
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true,
        participants: {
          where: { userId: participantId },
          include: { user: true }
        }
      }
    });

    if (!gamePost || !gamePost.participants[0]) return;

    const participant = gamePost.participants[0];

    return createAndSendNotification({
      type: 'GAME_POST_PARTICIPANT_JOINED',
      title: `게임메이트 참여 알림`,
      body: `${participant.user?.name || participant.guestName}님이 ${gamePost.game?.name || gamePost.customGameName} 게임에 참여했습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'NORMAL',
      recipientId: gamePost.authorId,
      gamePostId
    });
  },

  // 게임 시작 임박 알림
  async notifyGameStartingSoon(gamePostId: string) {
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true,
        participants: true
      }
    });

    if (!gamePost) return;

    const participantIds = gamePost.participants
      .map(p => p.userId)
      .filter(Boolean) as string[];

    return createAndSendNotification({
      type: 'GAME_POST_STARTING_SOON',
      title: `게임 시작 임박!`,
      body: `${gamePost.game?.name || gamePost.customGameName} 게임이 곧 시작됩니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'HIGH',
      senderId: gamePost.authorId,
      isGroupSend: true,
      groupType: 'GAME_PARTICIPANTS',
      gamePostId
    });
  }
};
