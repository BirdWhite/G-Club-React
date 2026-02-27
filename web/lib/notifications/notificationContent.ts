
import { NotificationCategory, NotificationEventType } from '@/types/models';

export interface NotificationContent {
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
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
    type: NotificationCategory,
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
    const baseUrl = `/game-mate/${gamePost.id}`;
    const baseIcon = gamePost.game?.iconUrl || '/icons/maskable_icon_x512.png';

    // 알림 내용 템플릿
    const templates: Record<NotificationCategory, Partial<Record<NotificationEventType, NotificationContent>>> = {
      [NotificationCategory.NEW_GAME_POST]: {
        [NotificationEventType.MEMBER_JOIN]: {
          title: `${gamePost.title} - 새로운 모집`,
          body: `${additionalData?.authorName}님이 새로운 모집을 시작했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationCategory.MY_GAME_POST]: {
        [NotificationEventType.MEMBER_JOIN]: {
          title: `${gamePost.title} - 참여`,
          body: `모임에 ${additionalData?.participantName}님이 참여했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEMBER_LEAVE]: {
          title: `${gamePost.title} - 퇴장`,
          body: `모임에서 ${additionalData?.participantName}님이 퇴장했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.GAME_FULL]: {
          title: `${gamePost.title} - 게임 시작 준비 완료!`,
          body: `모임 인원이 모두 모였어요. 이제 게임 시작만 남았습니다!`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.BEFORE_MEETING]: {
          title: `${gamePost.title} - 모임 시작 ${additionalData?.minutesBefore}분 전`,
          body: `내가 작성한 모임이 곧 시작됩니다`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEETING_START]: {
          title: `${gamePost.title} - 게임을 시작 할 시간이에요!`,
          body: `내가 작성한 모임이 시작되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationCategory.PARTICIPATING_GAME]: {
        [NotificationEventType.MEMBER_JOIN]: {
          title: `${gamePost.title} - 참여`,
          body: `모임에 ${additionalData?.participantName}님이 참여했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEMBER_LEAVE]: {
          title: `${gamePost.title} - 퇴장`,
          body: `모임에서 ${additionalData?.participantName}님이 퇴장했어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.GAME_FULL]: {
          title: `${gamePost.title} - 게임 시작 준비 완료!`,
          body: `모임 인원이 모두 모였어요. 이제 게임 시작만 남았습니다!`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.GAME_CANCELLED]: {
          title: `${gamePost.title} - 게임메이트가 취소되었습니다`,
          body: `${additionalData?.authorName}님이 게임메이트를 취소했습니다`,
          icon: baseIcon,
          actionUrl: '/game-mate'
        },
        [NotificationEventType.TIME_CHANGE]: {
          title: `${gamePost.title} - 모임 시간이 변경되었습니다`,
          body: `모임 시간이 ${additionalData?.oldTime}에서 ${additionalData?.newTime}으로 변경되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.BEFORE_MEETING]: {
          title: `${gamePost.title} - 모임 시작 ${additionalData?.minutesBefore}분 전`,
          body: `모임이 곧 시작됩니다`,
          icon: baseIcon,
          actionUrl: baseUrl
        },
        [NotificationEventType.MEETING_START]: {
          title: `${gamePost.title} - 게임을 시작 할 시간이에요!`,
          body: `모임이 시작되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationCategory.WAITING_LIST]: {
        [NotificationEventType.PROMOTED]: {
          title: `${gamePost.title} - 모임 참여가 확정되었습니다`,
          body: `모임에 참여할 수 있게 되었어요`,
          icon: baseIcon,
          actionUrl: baseUrl
        }
      },
      [NotificationCategory.NOTICE]: {
        [NotificationEventType.NOTICE_PUBLISHED]: {
          title: '새로운 공지사항',
          body: '새로운 공지사항이 등록되었습니다',
          icon: '/icons/maskable_icon_x512.png',
          actionUrl: '/notices'
        }
      }
    };

    const template = templates[type]?.[eventType];
    if (!template) {
      return {
        title: `${gamePost.title} - 알림`,
        body: `알림이 있어요`,
        icon: baseIcon,
        actionUrl: baseUrl
      };
    }

    return template;
  }


}
