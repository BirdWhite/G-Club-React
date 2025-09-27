import { GamePost } from '@prisma/client';

export interface NotificationContent {
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
}

export class NotificationContentGenerator {
  /**
   * 새로운 게임 포스트 알림
   */
  static generateNewGamePostNotification(
    gamePost: GamePost & { game: { name: string }; author: { name: string } }
  ): NotificationContent {
    return {
      title: '새로운 게임메이트 모집!',
      body: `${gamePost.game.name} - ${gamePost.author.name}님이 새로운 모집을 시작했어요`,
      icon: '/icons/game-controller.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 참여자 추가 알림
   */
  static generateParticipantJoinedNotification(
    gamePost: GamePost & { game: { name: string } },
    participant: { name: string }
  ): NotificationContent {
    return {
      title: '새로운 참여자가 추가되었습니다',
      body: `${gamePost.game.name} 모임에 ${participant.name}님이 참여했어요`,
      icon: '/icons/user-plus.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 참여자 탈퇴 알림
   */
  static generateParticipantLeftNotification(
    gamePost: GamePost & { game: { name: string } },
    participant: { name: string }
  ): NotificationContent {
    return {
      title: '참여자가 모임을 떠났습니다',
      body: `${gamePost.game.name} 모임에서 ${participant.name}님이 탈퇴했어요`,
      icon: '/icons/user-minus.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 모임 정원 마감 알림
   */
  static generateGameFullNotification(
    gamePost: GamePost & { game: { name: string } }
  ): NotificationContent {
    return {
      title: '모임 정원이 마감되었습니다',
      body: `${gamePost.game.name} 모임의 참여자 모집이 완료되었어요`,
      icon: '/icons/check-circle.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 모임 시간 변경 알림
   */
  static generateTimeChangeNotification(
    gamePost: GamePost & { game: { name: string } },
    oldTime: string,
    newTime: string
  ): NotificationContent {
    return {
      title: '모임 시간이 변경되었습니다',
      body: `${gamePost.game.name} 모임 시간이 ${oldTime}에서 ${newTime}으로 변경되었어요`,
      icon: '/icons/clock.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 모임 시작 전 알림
   */
  static generateBeforeMeetingNotification(
    gamePost: GamePost & { game: { name: string } },
    minutesBefore: number
  ): NotificationContent {
    return {
      title: `모임 시작 ${minutesBefore}분 전`,
      body: `${gamePost.game.name} 모임이 곧 시작됩니다`,
      icon: '/icons/alert-circle.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 모임 시작 알림
   */
  static generateMeetingStartNotification(
    gamePost: GamePost & { game: { name: string } }
  ): NotificationContent {
    return {
      title: '모임이 시작되었습니다',
      body: `${gamePost.game.name} 모임이 시작되었어요`,
      icon: '/icons/play-circle.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 대기열에서 참여로 승격 알림
   */
  static generatePromotedFromWaitingNotification(
    gamePost: GamePost & { game: { name: string } }
  ): NotificationContent {
    return {
      title: '모임 참여가 확정되었습니다',
      body: `${gamePost.game.name} 모임에 참여할 수 있게 되었어요`,
      icon: '/icons/star.png',
      actionUrl: `/game-mate/${gamePost.id}`
    };
  }

  /**
   * 개인화된 알림 내용 생성
   */
  static generatePersonalizedNotification(
    baseContent: NotificationContent,
    userPreferences?: {
      nickname?: string;
      preferredStyle?: 'formal' | 'casual';
    }
  ): NotificationContent {
    const style = userPreferences?.preferredStyle || 'casual';
    const nickname = userPreferences?.nickname;

    if (style === 'formal') {
      return {
        ...baseContent,
        title: baseContent.title,
        body: nickname ? `${nickname}님, ${baseContent.body}` : baseContent.body
      };
    }

    // casual 스타일 (기본)
    return {
      ...baseContent,
      title: baseContent.title,
      body: nickname ? `${nickname}님! ${baseContent.body}` : baseContent.body
    };
  }

  /**
   * 게임 포스트 ID에서 상세 정보 조회 없이 기본 알림 생성
   */
  static generateBasicNotification(
    type: string,
    gameName: string,
    additionalInfo?: string
  ): NotificationContent {
    const notifications: Record<string, NotificationContent> = {
      'NEW_GAME_POST': {
        title: '새로운 게임메이트 모집!',
        body: `${gameName} 새로운 모집이 시작되었어요`,
        icon: '/icons/game-controller.png'
      },
      'PARTICIPANT_JOIN': {
        title: '새로운 참여자',
        body: `${gameName} 모임에 새로운 참여자가 추가되었어요`,
        icon: '/icons/user-plus.png'
      },
      'PARTICIPANT_LEAVE': {
        title: '참여자 탈퇴',
        body: `${gameName} 모임에서 참여자가 탈퇴했어요`,
        icon: '/icons/user-minus.png'
      },
      'GAME_FULL': {
        title: '모임 정원 마감',
        body: `${gameName} 모임의 참여자 모집이 완료되었어요`,
        icon: '/icons/check-circle.png'
      }
    };

    const baseNotification = notifications[type] || {
      title: '게임메이트 알림',
      body: `${gameName} 관련 알림이 있어요`,
      icon: '/icons/bell.png'
    };

    if (additionalInfo) {
      baseNotification.body += ` - ${additionalInfo}`;
    }

    return baseNotification;
  }
}
