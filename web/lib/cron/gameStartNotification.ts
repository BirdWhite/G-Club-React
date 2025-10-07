import cron from 'node-cron';
import prisma from '@/lib/database/prisma';
import { createAndSendNotification } from '@/lib/notifications/notificationService';

export function startGameStartNotification() {
  console.log('게임 시작 전 알림 스케줄러를 시작합니다...');

  // 1시간전, 30분전 알림을 위한 30분마다 실행 (매시각 0분, 30분)
  cron.schedule('0,30 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 게임 시작 전 알림 작업 시작 (1시간전, 30분전)...`);
    
    try {
      const currentTime = new Date();
      
      // 1시간 후와 30분 후 시간 계산
      const oneHourLater = new Date(currentTime.getTime() + 60 * 60 * 1000);
      const thirtyMinutesLater = new Date(currentTime.getTime() + 30 * 60 * 1000);
      
      console.log(`현재 시간: ${currentTime.toISOString()}`);
      console.log(`1시간 후: ${oneHourLater.toISOString()}`);
      console.log(`30분 후: ${thirtyMinutesLater.toISOString()}`);
      
      // 1시간전 알림 설정이 활성화된 사용자들 조회
      const oneHourUsers = await prisma.notificationSetting.findMany({
        where: {
          OR: [
            {
              participatingGameEnabled: true,
              participatingGameBeforeMeetingEnabled: true,
              participatingGameBeforeMeetingMinutes: 60
            },
            {
              myGamePostEnabled: true,
              myGamePostBeforeMeetingEnabled: true,
              myGamePostBeforeMeetingMinutes: 60
            }
          ]
        },
        include: {
          user: true
        }
      });
      
      // 30분전 알림 설정이 활성화된 사용자들 조회
      const thirtyMinUsers = await prisma.notificationSetting.findMany({
        where: {
          OR: [
            {
              participatingGameEnabled: true,
              participatingGameBeforeMeetingEnabled: true,
              participatingGameBeforeMeetingMinutes: 30
            },
            {
              myGamePostEnabled: true,
              myGamePostBeforeMeetingEnabled: true,
              myGamePostBeforeMeetingMinutes: 30
            }
          ]
        },
        include: {
          user: true
        }
      });
      
      // 1시간 후 시작하는 게임들 조회
      const oneHourGames = await prisma.gamePost.findMany({
        where: {
          status: 'OPEN',
          startTime: {
            gte: oneHourLater,
            lt: new Date(oneHourLater.getTime() + 5 * 60 * 1000) // 5분 범위
          }
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          isFull: true,
          authorId: true,
          gameId: true,
          customGameName: true,
          game: {
            select: {
              name: true
            }
          },
          author: {
            select: {
              userId: true,
              name: true
            }
          },
          participants: {
            select: {
              userId: true
            }
          }
        }
      });
      
      // 30분 후 시작하는 게임들 조회
      const thirtyMinGames = await prisma.gamePost.findMany({
        where: {
          status: 'OPEN',
          startTime: {
            gte: thirtyMinutesLater,
            lt: new Date(thirtyMinutesLater.getTime() + 5 * 60 * 1000) // 5분 범위
          }
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          isFull: true,
          authorId: true,
          gameId: true,
          customGameName: true,
          game: {
            select: {
              name: true
            }
          },
          author: {
            select: {
              userId: true,
              name: true
            }
          },
          participants: {
            select: {
              userId: true
            }
          }
        }
      });
      
      console.log(`1시간 후 시작하는 게임: ${oneHourGames.length}개`);
      console.log(`30분 후 시작하는 게임: ${thirtyMinGames.length}개`);
      
      // 1시간전 알림 발송
      for (const game of oneHourGames) {
        await sendBeforeMeetingNotifications(game, oneHourUsers, 60);
      }
      
      // 30분전 알림 발송
      for (const game of thirtyMinGames) {
        await sendBeforeMeetingNotifications(game, thirtyMinUsers, 30);
      }
      
      console.log(`[${new Date().toISOString()}] 게임 시작 전 알림 작업 완료`);
    } catch (error) {
      console.error('게임 시작 전 알림 작업 중 오류 발생:', error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  // 10분전 알림을 위한 매시각 50분, 20분에 실행
  cron.schedule('20,50 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 게임 시작 전 알림 작업 시작 (10분전)...`);
    
    try {
      const currentTime = new Date();
      const tenMinutesLater = new Date(currentTime.getTime() + 10 * 60 * 1000);
      
      console.log(`현재 시간: ${currentTime.toISOString()}`);
      console.log(`10분 후: ${tenMinutesLater.toISOString()}`);
      
      // 10분전 알림 설정이 활성화된 사용자들 조회
      const tenMinUsers = await prisma.notificationSetting.findMany({
        where: {
          OR: [
            {
              participatingGameEnabled: true,
              participatingGameBeforeMeetingEnabled: true,
              participatingGameBeforeMeetingMinutes: 10
            },
            {
              myGamePostEnabled: true,
              myGamePostBeforeMeetingEnabled: true,
              myGamePostBeforeMeetingMinutes: 10
            }
          ]
        },
        include: {
          user: true
        }
      });
      
      // 10분 후 시작하는 게임들 조회
      const tenMinGames = await prisma.gamePost.findMany({
        where: {
          status: 'OPEN',
          startTime: {
            gte: tenMinutesLater,
            lt: new Date(tenMinutesLater.getTime() + 5 * 60 * 1000) // 5분 범위
          }
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          isFull: true,
          authorId: true,
          gameId: true,
          customGameName: true,
          game: {
            select: {
              name: true
            }
          },
          author: {
            select: {
              userId: true,
              name: true
            }
          },
          participants: {
            select: {
              userId: true
            }
          }
        }
      });
      
      console.log(`10분 후 시작하는 게임: ${tenMinGames.length}개`);
      
      // 10분전 알림 발송
      for (const game of tenMinGames) {
        await sendBeforeMeetingNotifications(game, tenMinUsers, 10);
      }
      
      console.log(`[${new Date().toISOString()}] 게임 시작 전 알림 작업 완료 (10분전)`);
    } catch (error) {
      console.error('게임 시작 전 알림 작업 중 오류 발생 (10분전):', error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  console.log('게임 시작 전 알림 스케줄러가 성공적으로 시작되었습니다.');
}

// 게임 시작 전 알림 발송 함수
async function sendBeforeMeetingNotifications(
  game: {
    id: string;
    title: string;
    startTime: Date;
    isFull: boolean;
    authorId: string;
    gameId: string | null;
    customGameName: string | null;
    game: { name: string } | null;
    author: { userId: string; name: string };
    participants: Array<{ userId: string | null }>;
  },
  users: Array<{
    user: { userId: string; name: string };
    participatingGameEnabled: boolean;
    participatingGameBeforeMeetingEnabled: boolean;
    participatingGameBeforeMeetingMinutes: number;
    participatingGameBeforeMeetingOnlyFull: boolean;
    myGamePostEnabled: boolean;
    myGamePostBeforeMeetingEnabled: boolean;
    myGamePostBeforeMeetingMinutes: number;
    myGamePostBeforeMeetingOnlyFull: boolean;
  }>,
  minutesBefore: number
) {
  const gameStartTime = new Date(game.startTime);
  const isFull = game.isFull; // 데이터베이스의 isFull 컬럼 사용
  
  for (const userSetting of users) {
    const user = userSetting.user;
    
    // 사용자가 이 게임에 참여하고 있는지 확인
    const isParticipant = game.participants.some((p) => p.userId === user.userId);
    const isAuthor = game.authorId === user.userId;
    
    if (!isParticipant && !isAuthor) continue;
    
    // 알림 설정 확인
    let shouldNotify = false;
    
    if (isParticipant) {
      // 참여자 알림 설정 확인
      if (userSetting.participatingGameEnabled && 
          userSetting.participatingGameBeforeMeetingEnabled &&
          userSetting.participatingGameBeforeMeetingMinutes === minutesBefore) {
        
        // 모임이 다 모였을 때만 알림 설정이 활성화되어 있다면 확인
        if (userSetting.participatingGameBeforeMeetingOnlyFull && !isFull) {
          continue;
        }
        
        shouldNotify = true;
      }
    }
    
    if (isAuthor) {
      // 작성자 알림 설정 확인
      if (userSetting.myGamePostEnabled && 
          userSetting.myGamePostBeforeMeetingEnabled &&
          userSetting.myGamePostBeforeMeetingMinutes === minutesBefore) {
        
        // 모임이 다 모였을 때만 알림 설정이 활성화되어 있다면 확인
        if (userSetting.myGamePostBeforeMeetingOnlyFull && !isFull) {
          continue;
        }
        
        shouldNotify = true;
      }
    }
    
    if (!shouldNotify) continue;
    
    // 알림 발송
    try {
      const gameName = game.game?.name || game.customGameName || '게임';
      const title = `${gameName} 게임 ${minutesBefore}분 전 알림`;
      const body = isAuthor 
        ? `내가 작성한 "${game.title}" 게임이 ${minutesBefore}분 후 시작됩니다.`
        : `참여한 "${game.title}" 게임이 ${minutesBefore}분 후 시작됩니다.`;
      
      await createAndSendNotification({
        type: 'GAME_BEFORE_START',
        title,
        body,
        recipientId: user.userId,
        gamePostId: game.id,
        priority: 'NORMAL',
        data: {
          gameId: game.gameId || undefined,
          gameName,
          startTime: gameStartTime.toISOString(),
          minutesBefore,
          isFull,
          isAuthor
        },
        context: {
          userId: user.userId,
          gameId: game.gameId || undefined,
          additionalData: {
            isAuthor,
            minutesBefore,
            isFull
          }
        }
      });
      
      console.log(`알림 발송 완료: ${user.name} - ${game.title} (${minutesBefore}분 전)`);
    } catch (error) {
      console.error(`알림 발송 실패: ${user.name} - ${game.title}`, error);
    }
  }
}

// 스케줄러 중지 함수
export function stopGameStartNotification() {
  console.log('게임 시작 전 알림 스케줄러를 중지합니다...');
  cron.getTasks().forEach((task) => {
    const status = task.getStatus();
    if (typeof status === 'string' && status === 'scheduled') {
      task.stop();
    }
  });
  console.log('게임 시작 전 알림 스케줄러가 중지되었습니다.');
}
