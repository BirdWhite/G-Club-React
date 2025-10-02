
export interface NotificationContent {
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
}

// 알림 타입 enum
export enum NotificationType {
  NEW_GAME_POST = 'NEW_GAME_POST',
  MY_GAME_POST_UPDATE = 'MY_GAME_POST_UPDATE',
  PARTICIPATING_GAME_UPDATE = 'PARTICIPATING_GAME_UPDATE',
  WAITING_LIST_UPDATE = 'WAITING_LIST_UPDATE'
}

// 알림 이벤트 타입 enum
export enum NotificationEventType {
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  GAME_FULL = 'GAME_FULL',
  PROMOTED = 'PROMOTED',
  TIME_CHANGE = 'TIME_CHANGE',
  BEFORE_MEETING = 'BEFORE_MEETING',
  MEETING_START = 'MEETING_START',
  GAME_CANCELLED = 'GAME_CANCELLED'
}


// Prisma 쿼리 결과에서 사용하는 GamePost 타입
interface PrismaGamePost {
  id: string;
  title: string;
  game?: { name: string; iconUrl?: string | null } | null;
  customGameName?: string | null;
  gameId?: string | null;
}

export class NotificationContentGenerator {
  /**
   * 통합된 알림 생성기 - 타입과 이벤트에 따라 알림 내용 생성
   */
  static generateNotification(
    type: NotificationType,
    eventType: NotificationEventType,
    gamePost: PrismaGamePost,
    additionalData?: {
      participantName?: string;
      authorName?: string;
      oldTime?: string;
      newTime?: string;
      minutesBefore?: number;
    }
  ): NotificationContent {
    const gameName = gamePost.game?.name || gamePost.customGameName || '';
    const baseUrl = `/game-mate/${gamePost.id}`;
    const baseIcon = gamePost.game?.iconUrl || '/icons/maskable_icon_x512.png';

    // 알림 내용 템플릿
    const templates: Record<NotificationType, Partial<Record<NotificationEventType, NotificationContent>>> = {
      [NotificationType.NEW_GAME_POST]: {
        [NotificationEventType.MEMBER_JOIN]: {
          title: `${gamePost.title} - 새로운 모집`,
          body: `${additionalData?.authorName}님이 새로운 모집을 시작했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationType.MY_GAME_POST_UPDATE]: {
        [NotificationEventType.MEMBER_JOIN]: {
          title: `${gamePost.title} - 새로운 참가자가 추가되었습니다`,
          body: `${gameName} 모임에 ${additionalData?.participantName}님이 참가했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEMBER_LEAVE]: {
          title: `${gamePost.title} - 참가자가 모임을 떠났습니다`,
          body: `${gameName} 모임에서 ${additionalData?.participantName}님이 탈퇴했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.GAME_FULL]: {
          title: `${gamePost.title} - 게임 시작 준비 완료!`,
          body: `${gameName} 모임 인원이 모두 모였어요. 이제 게임 시작만 남았습니다!`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationType.PARTICIPATING_GAME_UPDATE]: {
        [NotificationEventType.MEMBER_JOIN]: {
          title: `${gamePost.title} - 새로운 참가자가 추가되었습니다`,
          body: `${gameName} 모임에 ${additionalData?.participantName}님이 참가했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEMBER_LEAVE]: {
          title: `${gamePost.title} - 참가자가 모임을 떠났습니다`,
          body: `${gameName} 모임에서 ${additionalData?.participantName}님이 탈퇴했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.GAME_FULL]: {
          title: `${gamePost.title} - 게임 시작 준비 완료!`,
          body: `${gameName} 모임 인원이 모두 모였어요. 이제 게임 시작만 남았습니다!`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.TIME_CHANGE]: {
          title: `${gamePost.title} - 모임 시간이 변경되었습니다`,
          body: `${gameName} 모임 시간이 ${additionalData?.oldTime}에서 ${additionalData?.newTime}으로 변경되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.BEFORE_MEETING]: {
          title: `${gamePost.title} - 모임 시작 ${additionalData?.minutesBefore}분 전`,
          body: `${gameName} 모임이 곧 시작됩니다`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEETING_START]: {
          title: `${gamePost.title} - 게임을 시작 할 시간이에요!`,
          body: `${gameName} 모임이 시작되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationType.WAITING_LIST_UPDATE]: {
        [NotificationEventType.PROMOTED]: {
          title: `${gamePost.title} - 모임 참여가 확정되었습니다`,
          body: `${gameName} 모임에 참여할 수 있게 되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      }
    };

    const template = templates[type]?.[eventType];
    if (!template) {
      // 기본 템플릿
      return {
        title: `${gamePost.title} - 알림`,
        body: `${gameName} 관련 알림이 있어요`,
        icon: baseIcon,
        actionUrl: baseUrl
      };
    }

    return template;
  }


}
