import prisma from '@/lib/database/prisma';
import { sendPushNotificationInternal } from './pushNotifications';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { NotificationFilter, NotificationContext } from './notificationFilter';
import { NotificationContentGenerator } from './notificationContent';
import { NotificationDatabaseType, NotificationCategory, NotificationEventType } from '@/types/models';

// 데이터베이스 타입을 알림 카테고리로 매핑
function mapDatabaseTypeToCategory(dbType: string): string {
  // GAME_POST_NEW → NEW_GAME_POST
  if (dbType === NotificationDatabaseType.GAME_POST_NEW) {
    return NotificationCategory.NEW_GAME_POST;
  }
  
  // GAME_POST_MEMBER_JOIN, MEMBER_LEAVE, FULL, TIME_CHANGE, CANCELLED, BEFORE_START, START → PARTICIPATING_GAME
  if ([
    NotificationDatabaseType.GAME_POST_MEMBER_JOIN,
    NotificationDatabaseType.GAME_POST_MEMBER_LEAVE,
    NotificationDatabaseType.GAME_POST_FULL,
    NotificationDatabaseType.GAME_POST_TIME_CHANGE,
    NotificationDatabaseType.GAME_POST_CANCELLED,
    NotificationDatabaseType.GAME_POST_BEFORE_START,
    NotificationDatabaseType.GAME_POST_START
  ].includes(dbType as NotificationDatabaseType)) {
    return NotificationCategory.PARTICIPATING_GAME;
  }
  
  // WAITING_LIST_* → WAITING_LIST
  if ([
    NotificationDatabaseType.WAITING_LIST_PROMOTED,
    NotificationDatabaseType.WAITING_LIST_INVITED
  ].includes(dbType as NotificationDatabaseType)) {
    return NotificationCategory.WAITING_LIST;
  }
  
  // NOTICE_* → NOTICE
  if ([
    NotificationDatabaseType.NOTICE_NEW,
    NotificationDatabaseType.NOTICE_UPDATED
  ].includes(dbType as NotificationDatabaseType)) {
    return NotificationCategory.NOTICE;
  }
  
  // 기본값: 그대로 반환
  return dbType;
}

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
      
      // 데이터베이스 타입을 알림 카테고리로 매핑
      const category = mapDatabaseTypeToCategory(type);
      
      // 알림 설정에 따라 필터링 적용
      const filteredUserIds = await NotificationFilter.filterUsersForNotification(
        targetUserIds,
        category,
        context
      );
      
      if (filteredUserIds.length > 0) {
        await prisma.notificationReceipt.createMany({
          data: filteredUserIds.map(userId => ({
            notificationId: notification.id,
            userId
          })),
          skipDuplicates: true
        });
      }
    }

    // 푸시 알림 발송 (예약이 아닌 경우)
    if (!scheduledAt) {
      // 개별 발송인 경우
      if (!isGroupSend && recipientId) {
        await sendPushNotificationToUsers(
          notification.id, 
          [recipientId], 
          {
            title,
            body,
            icon,
            data: {
              notificationId: notification.id,
              actionUrl,
              ...data
            }
          }
        );
      }
      // 그룹 발송인 경우 - 이미 필터링된 사용자들에게만 발송
      else if (isGroupSend && targetUserIds.length > 0) {
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
          }
        );
      }

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
  }
) {
  try {
    // 이미 필터링된 사용자들이므로 추가 필터링 불필요
    if (userIds.length === 0) {
      return;
    }
    
    // 사용자들의 푸시 구독 정보 조회
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: userIds },
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

    // NotificationContentGenerator를 사용하여 알림 콘텐츠 생성
    const notificationContent = NotificationContentGenerator.generateNotification(
      NotificationCategory.NEW_GAME_POST,
      NotificationEventType.MEMBER_JOIN,
      gamePost,
      { authorName: gamePost.author?.name }
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_NEW,
      title: notificationContent.title,
      body: notificationContent.body,
      icon: notificationContent.icon,
      actionUrl: notificationContent.actionUrl,
      priority: 'NORMAL',
      senderId: authorId,
      isGroupSend: true,
      groupType: 'ALL_USERS_EXCEPT_AUTHOR',
      groupFilter: { authorId },
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        gamePostId: gamePost.id
      }
    });
  },

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

    const gamePost = await prisma.gamePost.findUnique({
      where: { id: context.gamePostId },
      include: {
        game: { select: { name: true, iconUrl: true } }
      }
    });

    if (!gamePost) return;

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.PARTICIPATING_GAME,
      NotificationEventType.GAME_CANCELLED,
      gamePost,
      { authorName: context.authorName }
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_CANCELLED,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
      priority: 'HIGH',
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: participantUserIds },
      gamePostId: context.gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
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

    const shouldSend = await NotificationFilter.shouldSendNotification(
      gamePost.authorId,
      NotificationCategory.MY_GAME_POST,
      {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_JOIN'
      }
    );

    if (!shouldSend) {
      console.log(`작성자 ${gamePost.authorId}는 참여자 추가 알림을 받지 않습니다.`);
      return;
    }

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.MY_GAME_POST,
      NotificationEventType.MEMBER_JOIN,
      gamePost,
      { participantName }
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_MEMBER_JOIN,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
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

    const filteredParticipantIds = await NotificationFilter.filterUsersForNotification(
      otherParticipantIds,
      NotificationCategory.PARTICIPATING_GAME,
      {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_JOIN'
      }
    );

    if (filteredParticipantIds.length === 0) {
      console.log(`참여자 추가 알림을 받을 사용자가 없습니다.`);
      return;
    }

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.PARTICIPATING_GAME,
      NotificationEventType.MEMBER_JOIN,
      gamePost,
      { participantName }
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_MEMBER_JOIN,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
      priority: 'NORMAL',
      senderId: participantId,
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: filteredParticipantIds },
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

    const filteredParticipantIds = await NotificationFilter.filterUsersForNotification(
      participantIds,
      NotificationCategory.PARTICIPATING_GAME,
      {
        gameId: gamePost.gameId || undefined,
        eventType: 'GAME_FULL'
      }
    );

    if (filteredParticipantIds.length === 0) {
      console.log(`모임 가득참 알림을 받을 사용자가 없습니다.`);
      return;
    }

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.PARTICIPATING_GAME,
      NotificationEventType.GAME_FULL,
      gamePost
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_FULL,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
      priority: 'HIGH',
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: filteredParticipantIds },
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

    const shouldSend = await NotificationFilter.shouldSendNotification(
      gamePost.authorId,
      NotificationCategory.MY_GAME_POST,
      {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_LEAVE'
      }
    );

    if (!shouldSend) {
      console.log(`작성자 ${gamePost.authorId}는 참여자 탈퇴 알림을 받지 않습니다.`);
      return;
    }

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.MY_GAME_POST,
      NotificationEventType.MEMBER_LEAVE,
      gamePost,
      { participantName }
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_MEMBER_LEAVE,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
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

    const filteredParticipantIds = await NotificationFilter.filterUsersForNotification(
      otherParticipantIds,
      NotificationCategory.PARTICIPATING_GAME,
      {
        gameId: gamePost.gameId || undefined,
        eventType: 'MEMBER_LEAVE'
      }
    );

    if (filteredParticipantIds.length === 0) {
      console.log(`참여자 탈퇴 알림을 받을 사용자가 없습니다.`);
      return;
    }

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.PARTICIPATING_GAME,
      NotificationEventType.MEMBER_LEAVE,
      gamePost,
      { participantName }
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.GAME_POST_MEMBER_LEAVE,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
      priority: 'NORMAL',
      senderId: participantId,
      isGroupSend: true,
      groupType: 'SPECIFIC_USERS',
      groupFilter: { userIds: filteredParticipantIds },
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

    const shouldSend = await NotificationFilter.shouldSendNotification(
      promotedUserId,
      NotificationCategory.WAITING_LIST,
      {
        gameId: gamePost.gameId || undefined,
        eventType: 'PROMOTED'
      }
    );

    if (!shouldSend) {
      console.log(`사용자 ${promotedUserId}는 대기자 승격 알림을 받지 않습니다.`);
      return;
    }

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.WAITING_LIST,
      NotificationEventType.PROMOTED,
      gamePost
    );

    return createAndSendNotification({
      type: NotificationDatabaseType.WAITING_LIST_PROMOTED,
      title: content.title,
      body: content.body,
      icon: content.icon,
      actionUrl: content.actionUrl,
      priority: 'HIGH',
      recipientId: promotedUserId,
      gamePostId,
      context: {
        gameId: gamePost.gameId || undefined,
        eventType: 'PROMOTED'
      }
    });
  },

  async sendGameTimeChangedNotification(
    recipientIds: string[],
    data: {
      gamePostId: string;
      gameName: string;
      authorName: string;
      title: string;
      oldStartTime: Date;
      newStartTime: Date;
    }
  ) {
    const { gamePostId, oldStartTime, newStartTime } = data;

    const gamePost = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        game: { select: { name: true, iconUrl: true } }
      }
    });

    if (!gamePost) return;

    const formatTime = (date: Date) => {
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short'
      });
    };

    const content = NotificationContentGenerator.generateNotification(
      NotificationCategory.PARTICIPATING_GAME,
      NotificationEventType.TIME_CHANGE,
      gamePost,
      {
        oldTime: formatTime(oldStartTime),
        newTime: formatTime(newStartTime)
      }
    );

    for (const recipientId of recipientIds) {
      try {
        const shouldSend = await NotificationFilter.shouldSendNotification(
          recipientId,
          NotificationCategory.PARTICIPATING_GAME,
          {
            gameId: gamePost.gameId || undefined,
            eventType: 'TIME_CHANGE'
          }
        );

        if (!shouldSend) {
          console.log(`사용자 ${recipientId}는 게임 시간 변경 알림을 받지 않습니다.`);
          continue;
        }

        await createAndSendNotification({
          type: NotificationDatabaseType.GAME_POST_TIME_CHANGE,
          title: content.title,
          body: content.body,
          icon: content.icon,
          actionUrl: content.actionUrl,
          priority: 'HIGH',
          recipientId,
          gamePostId,
          context: {
            gameId: gamePost.gameId || undefined,
            eventType: 'TIME_CHANGE'
          }
        });

      } catch (error) {
        console.error(`사용자 ${recipientId}에게 게임 시간 변경 알림 발송 실패:`, error);
      }
    }
  }
};

export const notificationService = GamePostNotifications;
