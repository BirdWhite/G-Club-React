import prisma from '@/lib/database/prisma';
import { sendPushNotificationInternal } from './pushNotifications';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { NotificationFilter, NotificationContext } from './notificationFilter';

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
  groupFilter?: Record<string, unknown>;
  gamePostId?: string;
  scheduledAt?: Date;
  data?: Record<string, unknown>;
  context?: NotificationContext;
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
      data,
      context
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
        groupFilter: isGroupSend ? (groupFilter as InputJsonValue) : undefined,
        gamePostId,
        scheduledAt,
        data: data as InputJsonValue,
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
      await sendPushNotificationToUsers(
        notification.id, 
        targetUserIds, 
        {
          title,
          body,
          icon,
          data: {
            notificationId: notification.id,
            actionUrl,
            ...data
          }
        },
        type,
        gamePostId,
        context
      );

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
  groupFilter?: Record<string, unknown>, 
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
    
    case 'ALL_USERS_EXCEPT_AUTHOR':
      if (groupFilter?.authorId) {
        const allUsersExceptAuthor = await prisma.userProfile.findMany({
          where: { userId: { not: groupFilter.authorId as string } },
          select: { userId: true }
        });
        targetUsers = allUsersExceptAuthor.map(u => u.userId);
      }
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
    
    case 'SPECIFIC_USERS':
      if (groupFilter?.userIds && Array.isArray(groupFilter.userIds)) {
        targetUsers = groupFilter.userIds as string[];
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
    data?: Record<string, unknown>;
  },
  notificationType?: string,
  gamePostId?: string,
  context?: NotificationContext
) {
  try {
    // 개인화된 알림 필터링 적용
    const filteredUserIds = await NotificationFilter.filterUsersForNotification(
      userIds,
      notificationType || 'GENERAL',
      context
    );
    
    if (filteredUserIds.length === 0) {
      return;
    }
    
    // 사용자들의 푸시 구독 정보 조회
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: filteredUserIds },
        isEnabled: true
      }
    });
    
    if (subscriptions.length === 0) {
      console.log('푸시 구독이 활성화된 사용자가 없습니다.');
      return;
    }

    // 각 구독에 대해 푸시 발송
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        // 모든 알림을 high 우선순위, 10분 TTL로 설정
        const priority = 'high';
        const ttl = 600; // 10분

        await sendPushNotificationInternal({
          userId: sub.userId,
          title: pushData.title,
          body: pushData.body,
          url: (pushData.data?.actionUrl as string) || '/',
          tag: 'notification',
          notificationId, // 알림 ID 전달
          priority,
          ttl
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
      groupType: 'ALL_USERS_EXCEPT_AUTHOR',
      groupFilter: { authorId },
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
  },

  // 게임메이트 취소 알림
  async sendGamePostCancelledNotification(
    participantUserIds: string[],
    context: {
      gamePostId: string;
      gameName: string;
      authorName: string;
      title: string;
    }
  ) {
    if (participantUserIds.length === 0) return;

    // 게임 정보 조회하여 아이콘 가져오기
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: context.gamePostId },
      include: {
        game: {
          select: {
            iconUrl: true
          }
        }
      }
    });

    return createAndSendNotification({
      type: 'PARTICIPATING_GAME_UPDATE',
      title: `게임메이트가 취소되었습니다`,
      body: `${context.authorName}님이 "${context.title}" 게임메이트를 취소했습니다.`,
      icon: gamePost?.game?.iconUrl || '/icons/maskable_icon_x512.png',
      actionUrl: '/game-mate',
      priority: 'HIGH',
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: participantUserIds },
      gamePostId: context.gamePostId,
      context: {
        gameId: gamePost?.gameId || undefined,
        eventType: 'GAME_CANCELLED'
      }
    });
  },

  // 참여자 추가 알림 (작성자에게)
  async notifyParticipantJoinedToAuthor(
    gamePostId: string,
    participantId: string,
    participantName: string
  ) {
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true,
        author: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'MY_GAME_POST_UPDATE',
      title: `새로운 참여자`,
      body: `${participantName}님이 ${gamePost.game?.name || gamePost.customGameName} 게임에 참여했습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'NORMAL',
      senderId: participantId,
      recipientId: gamePost.authorId,
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_JOIN'
      }
    });
  },

  // 참여자 추가 알림 (다른 참여자들에게)
  async notifyParticipantJoinedToOthers(
    gamePostId: string,
    participantId: string,
    participantName: string,
    otherParticipantIds: string[]
  ) {
    if (otherParticipantIds.length === 0) return;

    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'PARTICIPATING_GAME_UPDATE',
      title: `새로운 참여자`,
      body: `${participantName}님이 ${gamePost.game?.name || gamePost.customGameName} 게임에 참여했습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'NORMAL',
      senderId: participantId,
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: otherParticipantIds },
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_JOIN'
      }
    });
  },

  // 모임이 가득 찼을 때 알림
  async notifyGameFull(
    gamePostId: string,
    participantIds: string[]
  ) {
    if (participantIds.length === 0) return;

    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'PARTICIPATING_GAME_UPDATE',
      title: `모임이 가득 찼습니다!`,
      body: `${gamePost.game?.name || gamePost.customGameName} 게임 모임이 가득 찼습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'HIGH',
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: participantIds },
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'GAME_FULL'
      }
    });
  },

  // 참여자 탈퇴 알림 (작성자에게)
  async notifyParticipantLeftToAuthor(
    gamePostId: string,
    participantId: string,
    participantName: string
  ) {
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true,
        author: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'MY_GAME_POST_UPDATE',
      title: `참여자 탈퇴`,
      body: `${participantName}님이 ${gamePost.game?.name || gamePost.customGameName} 게임에서 탈퇴했습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'NORMAL',
      senderId: participantId,
      recipientId: gamePost.authorId,
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_LEAVE'
      }
    });
  },

  // 참여자 탈퇴 알림 (다른 참여자들에게)
  async notifyParticipantLeftToOthers(
    gamePostId: string,
    participantId: string,
    participantName: string,
    otherParticipantIds: string[]
  ) {
    if (otherParticipantIds.length === 0) return;

    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'PARTICIPATING_GAME_UPDATE',
      title: `참여자 탈퇴`,
      body: `${participantName}님이 ${gamePost.game?.name || gamePost.customGameName} 게임에서 탈퇴했습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'NORMAL',
      senderId: participantId,
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: otherParticipantIds },
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_LEAVE'
      }
    });
  },

  // 대기자 승격 알림
  async notifyPromotedFromWaiting(
    gamePostId: string,
    promotedUserId: string
  ) {
    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: true
      }
    });

    if (!gamePost) return;

    return createAndSendNotification({
      type: 'WAITING_LIST_UPDATE',
      title: `대기자에서 승격되었습니다!`,
      body: `${gamePost.game?.name || gamePost.customGameName} 게임에 참여할 수 있게 되었습니다.`,
      icon: gamePost.game?.iconUrl || undefined,
      actionUrl: `/game-mate/${gamePostId}`,
      priority: 'HIGH',
      recipientId: promotedUserId,
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'PROMOTED'
      }
    });
  }
};

export const notificationService = GamePostNotifications;
