import prisma from '@/lib/database/prisma';

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
          newGamePostSettings: true,
          participatingGameEnabled: true,
          participatingGameSettings: true,
          myGamePostEnabled: true,
          myGamePostSettings: true,
          waitingListEnabled: true,
          customGameIds: true
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
      newGamePostSettings: unknown;
      participatingGameEnabled: boolean;
      participatingGameSettings: unknown;
      myGamePostEnabled: boolean;
      myGamePostSettings: unknown;
      waitingListEnabled: boolean;
      customGameIds?: string[];
    },
    notificationType: string,
    context?: NotificationContext
  ): Promise<boolean> {
    switch (notificationType) {
      case 'NEW_GAME_POST':
        if (!settings.newGamePostEnabled) return false;
        return await this.checkNewGamePostSettings(settings.newGamePostSettings, context, settings.customGameIds);
        
      case 'PARTICIPATING_GAME_UPDATE':
        if (!settings.participatingGameEnabled) return false;
        return this.checkParticipatingGameSettings(settings.participatingGameSettings, context);
        
      case 'MY_GAME_POST_UPDATE':
        if (!settings.myGamePostEnabled) return false;
        return this.checkMyGamePostSettings(settings.myGamePostSettings, context);
        
      case 'WAITING_LIST_UPDATE':
        return settings.waitingListEnabled;
        
      default:
        return true;
    }
  }
  
  /**
   * 새 게임 포스트 알림 설정 확인
   */
  private static async checkNewGamePostSettings(
    settings: unknown,
    context?: NotificationContext,
    customGameIds?: string[]
  ): Promise<boolean> {
    const settingsObj = settings as { gameFilters?: { mode?: string } } | null;
    if (!settingsObj?.gameFilters) return true;
    
    const { mode } = settingsObj.gameFilters;
    
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
    settings: unknown,
    context?: NotificationContext
  ): boolean {
    if (!settings) return true;
    
    const settingsObj = settings as {
      memberJoin?: boolean;
      memberLeave?: boolean;
      timeChange?: boolean;
      fullMeeting?: boolean;
      beforeMeeting?: { enabled?: boolean };
      meetingStart?: { enabled?: boolean };
    };
    
    const eventType = context?.eventType;
    
    switch (eventType) {
      case 'MEMBER_JOIN':
        return settingsObj.memberJoin !== false;
      case 'MEMBER_LEAVE':
        return settingsObj.memberLeave !== false;
      case 'TIME_CHANGE':
        return settingsObj.timeChange !== false;
      case 'GAME_FULL':
        return settingsObj.fullMeeting !== false;
      case 'BEFORE_MEETING':
        return settingsObj.beforeMeeting?.enabled !== false;
      case 'MEETING_START':
        return settingsObj.meetingStart?.enabled !== false;
      default:
        return true;
    }
  }
  
  /**
   * 내 게임 포스트 설정 확인
   */
  private static checkMyGamePostSettings(
    settings: unknown,
    context?: NotificationContext
  ): boolean {
    if (!settings) return true;
    
    const settingsObj = settings as {
      memberJoin?: boolean;
      memberLeave?: boolean;
      fullMeeting?: boolean;
      beforeMeeting?: { enabled?: boolean };
      meetingStart?: { enabled?: boolean };
    };
    
    const eventType = context?.eventType;
    
    switch (eventType) {
      case 'MEMBER_JOIN':
        return settingsObj.memberJoin !== false;
      case 'MEMBER_LEAVE':
        return settingsObj.memberLeave !== false;
      case 'GAME_FULL':
        return settingsObj.fullMeeting !== false;
      case 'BEFORE_MEETING':
        return settingsObj.beforeMeeting?.enabled !== false;
      case 'MEETING_START':
        return settingsObj.meetingStart?.enabled !== false;
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
   * 이벤트 타입별 설정 확인 (배치 처리용 - 동기)
   */
  private static checkEventTypeSettingsBatch(
    settings: unknown,
    context?: NotificationContext
  ): boolean {
    // settings가 null이면 기본값으로 허용
    if (!settings) return true;
    
    const settingsObj = settings as {
      memberJoin?: boolean;
      memberLeave?: boolean;
      fullMeeting?: boolean;
      gameCancelled?: boolean;
      beforeMeeting?: { enabled?: boolean };
      meetingStart?: { enabled?: boolean };
    };
    
    const eventType = context?.eventType;
    
    switch (eventType) {
      case 'MEMBER_JOIN':
        return settingsObj.memberJoin !== false;
      case 'MEMBER_LEAVE':
        return settingsObj.memberLeave !== false;
      case 'GAME_FULL':
        return settingsObj.fullMeeting !== false;
      case 'BEFORE_MEETING':
        return settingsObj.beforeMeeting?.enabled !== false;
      case 'MEETING_START':
        return settingsObj.meetingStart?.enabled !== false;
      case 'GAME_CANCELLED':
        return settingsObj.gameCancelled !== false;
      default:
        return true;
    }
  }
  
  /**
   * 카테고리별 설정 확인 (배치 처리용 - 동기)
   */
  private static checkCategorySettingsBatch(
    settings: {
      newGamePostEnabled: boolean;
      newGamePostSettings: unknown;
      participatingGameEnabled: boolean;
      participatingGameSettings: unknown;
      myGamePostEnabled: boolean;
      myGamePostSettings: unknown;
      waitingListEnabled: boolean;
      customGameIds: string[];
      user: {
        favoriteGames: { gameId: string }[];
      };
    },
    notificationType: string,
    context?: NotificationContext
  ): boolean {
    // settings가 null이면 기본값으로 허용
    if (!settings) return true;
    switch (notificationType) {
      case 'NEW_GAME_POST':
        if (!settings.newGamePostEnabled) return false;
        
        // 게임 필터 확인
        if (context?.gameId) {
          const gameSettings = settings.newGamePostSettings as {
            gameFilters?: {
              mode: string;
            };
          };
          
          const mode = gameSettings?.gameFilters?.mode;
          
          if (mode === 'all') {
            return true;
          }
          
          if (mode === 'favorites') {
            // 현재 게임이 사용자의 관심 게임 목록에 포함되어 있는지 확인
            return this.isFavoriteGame(settings.user.favoriteGames || [], context.gameId);
          }
          
          if (mode === 'custom') {
            // 커스텀으로 선택한 게임 배열에서 확인
            return settings.customGameIds.includes(context.gameId);
          }
        }
        return true;
        
      case 'PARTICIPATING_GAME_UPDATE':
        if (!settings.participatingGameEnabled) return false;
        return this.checkEventTypeSettingsBatch(settings.participatingGameSettings, context);
        
      case 'MY_GAME_POST_UPDATE':
        if (!settings.myGamePostEnabled) return false;
        return this.checkEventTypeSettingsBatch(settings.myGamePostSettings, context);
        
      case 'WAITING_LIST_UPDATE':
        return settings.waitingListEnabled;
        
      case 'GAME_POST_CANCELLED':
        // 게임메이트 취소는 PARTICIPATING_GAME_UPDATE 카테고리로 처리
        if (!settings.participatingGameEnabled) return false;
        return this.checkEventTypeSettingsBatch(settings.participatingGameSettings, context);
        
      default:
        return true;
    }
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
          newGamePostEnabled: true,
          newGamePostSettings: true,
          participatingGameEnabled: true,
          participatingGameSettings: true,
          myGamePostEnabled: true,
          myGamePostSettings: true,
          waitingListEnabled: true,
          customGameIds: true,
          doNotDisturbEnabled: true,
          doNotDisturbStart: true,
          doNotDisturbEnd: true,
          doNotDisturbDays: true,
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
      
      for (const setting of userSettings) {
        try {
          // 방해 금지 시간 확인
          if (this.isDoNotDisturbTime(setting)) {
            continue;
          }
          
          // 카테고리별 설정 확인
          const shouldSend = this.checkCategorySettingsBatch(
            setting,
            notificationType,
            context
          );
          
          if (shouldSend) {
            filteredUserIds.push(setting.userId);
          }
        } catch (error) {
          console.error(`사용자 ${setting.userId} 알림 필터링 중 오류:`, error);
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
}
