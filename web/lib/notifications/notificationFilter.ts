import prisma from '@/lib/database/prisma';
import { NotificationCategory } from '@/types/models';

export interface NotificationContext {
  gamePostId?: string;
  gameId?: string;
  userId?: string;
  eventType?: string;
  additionalData?: Record<string, unknown>;
}

export class NotificationFilter {
  /**
   * 사용자가 해당 알림을 받을지 확인
   */
  static async shouldSendNotification(
    userId: string,
    notificationType: string,
    context?: NotificationContext
  ): Promise<boolean> {
    try {
      // 1. 알림 설정 조회
      const settings = await prisma.notificationSetting.findUnique({
        where: { userId },
        select: {
          doNotDisturbEnabled: true,
          doNotDisturbStart: true,
          doNotDisturbEnd: true,
          doNotDisturbDays: true,
          newGamePostEnabled: true,
          newGamePostMode: true,
          customGameIds: true,
          participatingGameEnabled: true,
          participatingGameFullMeeting: true,
          participatingGameMemberJoin: true,
          participatingGameMemberLeave: true,
          participatingGameTimeChange: true,
          participatingGameCancelled: true,
          participatingGameBeforeMeetingEnabled: true,
          participatingGameBeforeMeetingMinutes: true,
          participatingGameBeforeMeetingOnlyFull: true,
          participatingGameMeetingStartEnabled: true,
          participatingGameMeetingStartOnlyFull: true,
          myGamePostEnabled: true,
          myGamePostFullMeeting: true,
          myGamePostMemberJoin: true,
          myGamePostMemberLeave: true,
          myGamePostBeforeMeetingEnabled: true,
          myGamePostBeforeMeetingMinutes: true,
          myGamePostBeforeMeetingOnlyFull: true,
          myGamePostMeetingStartEnabled: true,
          myGamePostMeetingStartOnlyFull: true,
          waitingListEnabled: true,
          noticeEnabled: true
        }
      });
      
      if (!settings) {
        console.log(`사용자 ${userId}의 알림 설정이 없습니다.`);
        return false;
      }
      
      // 2. 방해 금지 시간 확인
      if (this.isDoNotDisturbTime(settings)) {
        console.log(`사용자 ${userId}가 방해 금지 시간입니다.`);
        return false;
      }
      
      // 3. 카테고리별 설정 확인
      const shouldSend = await this.checkCategorySettings(
        settings, 
        notificationType, 
        context
      );
      
      console.log(`사용자 ${userId} 알림 설정 확인: ${shouldSend ? '허용' : '차단'} (${notificationType})`);
      return shouldSend;
    } catch (error) {
      console.error(`알림 필터링 중 오류 (userId: ${userId}):`, error);
      return false;
    }
  }
  
  /**
   * 방해 금지 시간 확인
   */
  private static isDoNotDisturbTime(settings: {
    doNotDisturbEnabled: boolean;
    doNotDisturbStart: string | null;
    doNotDisturbEnd: string | null;
    doNotDisturbDays: string[];
  }): boolean {
    if (!settings.doNotDisturbEnabled) return false;
    
    const now = new Date();
    const currentDay = now.getDay().toString(); // 0=일요일, 6=토요일
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM" 형식
    
    // 설정된 요일인지 확인
    if (!settings.doNotDisturbDays.includes(currentDay)) return false;
    
    const startTime = settings.doNotDisturbStart;
    const endTime = settings.doNotDisturbEnd;
    
    if (!startTime || !endTime) return false;
    
    // 시간 비교 (자정을 넘나드는 경우 고려)
    if (startTime <= endTime) {
      // 같은 날 내에서의 시간 범위
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // 자정을 넘나드는 경우
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
  
  /**
   * 카테고리별 설정 확인
   */
  private static async checkCategorySettings(
    settings: {
      newGamePostEnabled: boolean;
      newGamePostMode: string;
      customGameIds: string[];
      participatingGameEnabled: boolean;
      participatingGameFullMeeting: boolean;
      participatingGameMemberJoin: boolean;
      participatingGameMemberLeave: boolean;
      participatingGameTimeChange: boolean;
      participatingGameCancelled: boolean;
      participatingGameBeforeMeetingEnabled: boolean;
      participatingGameBeforeMeetingMinutes: number;
      participatingGameBeforeMeetingOnlyFull: boolean;
      participatingGameMeetingStartEnabled: boolean;
      participatingGameMeetingStartOnlyFull: boolean;
      myGamePostEnabled: boolean;
      myGamePostFullMeeting: boolean;
      myGamePostMemberJoin: boolean;
      myGamePostMemberLeave: boolean;
      myGamePostBeforeMeetingEnabled: boolean;
      myGamePostBeforeMeetingMinutes: number;
      myGamePostBeforeMeetingOnlyFull: boolean;
      myGamePostMeetingStartEnabled: boolean;
      myGamePostMeetingStartOnlyFull: boolean;
      waitingListEnabled: boolean;
      noticeEnabled: boolean;
    },
    notificationType: string,
    context?: NotificationContext
  ): Promise<boolean> {
    switch (notificationType) {
      case NotificationCategory.NEW_GAME_POST:
        if (!settings.newGamePostEnabled) return false;
        return await this.checkNewGamePostSettings(settings.newGamePostMode, context, settings.customGameIds);
        
      case NotificationCategory.PARTICIPATING_GAME:
        if (!settings.participatingGameEnabled) return false;
        return this.checkParticipatingGameSettings(settings, context);
        
      case NotificationCategory.MY_GAME_POST:
        if (!settings.myGamePostEnabled) return false;
        return this.checkMyGamePostSettings(settings, context);
        
      case NotificationCategory.WAITING_LIST:
        return settings.waitingListEnabled;
        
      case NotificationCategory.NOTICE:
        return settings.noticeEnabled;
        
      default:
        return true;
    }
  }
  
  /**
   * 새 게임 포스트 알림 설정 확인
   */
  private static async checkNewGamePostSettings(
    mode: string,
    context?: NotificationContext,
    customGameIds?: string[]
  ): Promise<boolean> {
    if (mode === 'all') return true;
    
    if (mode === 'favorites') {
      // 현재 게임이 사용자의 관심 게임 목록에 포함되어 있는지 확인
      if (!context?.gameId) return false;
      
      // 사용자의 관심 게임 조회
      const userFavoriteGames = await prisma.userFavoriteGame.findMany({
        where: { userId: context.userId || '', gameId: context.gameId },
        select: { gameId: true }
      });
      
      // 현재 게임이 관심 게임 목록에 포함되어 있으면 알림 발송
      return userFavoriteGames.length > 0;
    }
    
    if (mode === 'custom') {
      // 커스텀으로 선택한 게임 배열에서 확인
      if (!context?.gameId || !customGameIds) return false;
      return customGameIds.includes(context.gameId);
    }
    
    return true;
  }
  
  /**
   * 참여 중인 게임 설정 확인
   */
  private static checkParticipatingGameSettings(
    settings: {
      participatingGameFullMeeting: boolean;
      participatingGameMemberJoin: boolean;
      participatingGameMemberLeave: boolean;
      participatingGameTimeChange: boolean;
      participatingGameCancelled: boolean;
      participatingGameBeforeMeetingEnabled: boolean;
      participatingGameMeetingStartEnabled: boolean;
    },
    context?: NotificationContext
  ): boolean {
    const eventType = context?.eventType;
    
    switch (eventType) {
      case 'MEMBER_JOIN':
        return settings.participatingGameMemberJoin;
      case 'MEMBER_LEAVE':
        return settings.participatingGameMemberLeave;
      case 'TIME_CHANGE':
        return settings.participatingGameTimeChange;
      case 'GAME_FULL':
        return settings.participatingGameFullMeeting;
      case 'GAME_CANCELLED':
        return settings.participatingGameCancelled;
      case 'BEFORE_MEETING':
        return settings.participatingGameBeforeMeetingEnabled;
      case 'MEETING_START':
        return settings.participatingGameMeetingStartEnabled;
      default:
        return true;
    }
  }
  
  /**
   * 내 게임 포스트 설정 확인
   */
  private static checkMyGamePostSettings(
    settings: {
      myGamePostFullMeeting: boolean;
      myGamePostMemberJoin: boolean;
      myGamePostMemberLeave: boolean;
      myGamePostBeforeMeetingEnabled: boolean;
      myGamePostMeetingStartEnabled: boolean;
    },
    context?: NotificationContext
  ): boolean {
    const eventType = context?.eventType;
    
    switch (eventType) {
      case 'MEMBER_JOIN':
        return settings.myGamePostMemberJoin;
      case 'MEMBER_LEAVE':
        return settings.myGamePostMemberLeave;
      case 'GAME_FULL':
        return settings.myGamePostFullMeeting;
      case 'BEFORE_MEETING':
        return settings.myGamePostBeforeMeetingEnabled;
      case 'MEETING_START':
        return settings.myGamePostMeetingStartEnabled;
      default:
        return true;
    }
  }
  
  /**
   * 좋아하는 게임인지 확인 (배치 처리용)
   */
  private static isFavoriteGame(userFavoriteGames: { gameId: string }[], gameId?: string): boolean {
    if (!gameId) return false;
    
    // 현재 게임이 사용자의 관심 게임 목록에 포함되어 있는지 확인
    return userFavoriteGames.some(fav => fav.gameId === gameId);
  }
  
  
  /**
   * 여러 사용자의 알림 설정을 일괄 확인 (배치 처리)
   */
  static async filterUsersForNotification(
    userIds: string[],
    notificationType: string,
    context?: NotificationContext
  ): Promise<string[]> {
    if (userIds.length === 0) return [];
    
    try {
      // 1. 한 번의 쿼리로 모든 사용자 설정 조회
      const userSettings = await prisma.notificationSetting.findMany({
        where: {
          userId: { in: userIds }
        },
        select: {
          userId: true,
          doNotDisturbEnabled: true,
          doNotDisturbStart: true,
          doNotDisturbEnd: true,
          doNotDisturbDays: true,
          newGamePostEnabled: true,
          newGamePostMode: true,
          customGameIds: true,
          participatingGameEnabled: true,
          participatingGameFullMeeting: true,
          participatingGameMemberJoin: true,
          participatingGameMemberLeave: true,
          participatingGameTimeChange: true,
          participatingGameCancelled: true,
          participatingGameBeforeMeetingEnabled: true,
          participatingGameBeforeMeetingMinutes: true,
          participatingGameBeforeMeetingOnlyFull: true,
          participatingGameMeetingStartEnabled: true,
          participatingGameMeetingStartOnlyFull: true,
          myGamePostEnabled: true,
          myGamePostFullMeeting: true,
          myGamePostMemberJoin: true,
          myGamePostMemberLeave: true,
          myGamePostBeforeMeetingEnabled: true,
          myGamePostBeforeMeetingMinutes: true,
          myGamePostBeforeMeetingOnlyFull: true,
          myGamePostMeetingStartEnabled: true,
          myGamePostMeetingStartOnlyFull: true,
          waitingListEnabled: true,
          noticeEnabled: true,
          user: {
            select: {
              favoriteGames: {
                select: {
                  gameId: true
                }
              }
            }
          }
        }
      });
      
      // 2. 메모리에서 필터링
      const filteredUserIds: string[] = [];
      const settingsMap = new Map(userSettings.map(s => [s.userId, s]));
      
      for (const userId of userIds) {
        try {
          const setting = settingsMap.get(userId);
          
          // 알림 설정이 없는 사용자는 기본값으로 허용
          if (!setting) {
            console.log(`사용자 ${userId}의 알림 설정이 없습니다. 기본값으로 허용합니다.`);
            filteredUserIds.push(userId);
            continue;
          }
          
          // 방해 금지 시간 확인
          if (this.isDoNotDisturbTime(setting)) {
            continue;
          }
          
          // 카테고리별 설정 확인 (userId를 context에 추가)
          const userContext = { ...context, userId };
          const shouldSend = await this.checkCategorySettings(
            setting,
            notificationType,
            userContext
          );
          
          if (shouldSend) {
            filteredUserIds.push(userId);
          }
        } catch (error) {
          console.error(`사용자 ${userId} 알림 필터링 중 오류:`, error);
          // 오류 발생 시 해당 사용자는 알림을 받지 않음
          continue;
        }
      }
      
      console.log(`배치 필터링 결과: ${userIds.length}명 중 ${filteredUserIds.length}명이 알림을 받습니다.`);
      return filteredUserIds;
      
    } catch (error) {
      console.error('배치 알림 필터링 중 오류:', error);
      return [];
    }
  }

  /**
   * 게임 시작 전 알림 설정 확인
   */
  private static checkGameBeforeStartSettings(
    settings: {
      participatingGameEnabled: boolean;
      participatingGameBeforeMeetingEnabled: boolean;
      participatingGameBeforeMeetingMinutes: number;
      participatingGameBeforeMeetingOnlyFull: boolean;
      myGamePostEnabled: boolean;
      myGamePostBeforeMeetingEnabled: boolean;
      myGamePostBeforeMeetingMinutes: number;
      myGamePostBeforeMeetingOnlyFull: boolean;
    },
    context?: NotificationContext
  ): boolean {
    const { isAuthor, minutesBefore, isFull } = context?.additionalData || {};
    
    if (isAuthor) {
      // 작성자 알림 설정 확인
      if (!settings.myGamePostEnabled || !settings.myGamePostBeforeMeetingEnabled) {
        return false;
      }
      
      if (settings.myGamePostBeforeMeetingMinutes !== minutesBefore) {
        return false;
      }
      
      if (settings.myGamePostBeforeMeetingOnlyFull && !isFull) {
        return false;
      }
      
      return true;
    } else {
      // 참여자 알림 설정 확인
      if (!settings.participatingGameEnabled || !settings.participatingGameBeforeMeetingEnabled) {
        return false;
      }
      
      if (settings.participatingGameBeforeMeetingMinutes !== minutesBefore) {
        return false;
      }
      
      if (settings.participatingGameBeforeMeetingOnlyFull && !isFull) {
        return false;
      }
      
      return true;
    }
  }

  /**
   * 게임 시작 알림 설정 확인
   */
  private static checkGameStartSettings(
    settings: {
      participatingGameEnabled: boolean;
      participatingGameMeetingStartEnabled: boolean;
      participatingGameMeetingStartOnlyFull: boolean;
      myGamePostEnabled: boolean;
      myGamePostMeetingStartEnabled: boolean;
      myGamePostMeetingStartOnlyFull: boolean;
    },
    context?: NotificationContext
  ): boolean {
    const { isAuthor, isFull } = context?.additionalData || {};
    
    if (isAuthor) {
      // 작성자 알림 설정 확인
      if (!settings.myGamePostEnabled || !settings.myGamePostMeetingStartEnabled) {
        return false;
      }
      
      if (settings.myGamePostMeetingStartOnlyFull && !isFull) {
        return false;
      }
      
      return true;
    } else {
      // 참여자 알림 설정 확인
      if (!settings.participatingGameEnabled || !settings.participatingGameMeetingStartEnabled) {
        return false;
      }
      
      if (settings.participatingGameMeetingStartOnlyFull && !isFull) {
        return false;
      }
      
      return true;
    }
  }
}
