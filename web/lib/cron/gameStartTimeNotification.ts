import cron from 'node-cron';
import prisma from '@/lib/database/prisma';
import { createAndSendNotification } from '@/lib/notifications/notificationService';

export function startGameStartTimeNotification() {
  console.log('게임 시작 시간 알림 스케줄러를 시작합니다...');

  // 매시각 정각과 30분에 실행 (게임 시작 시간 알림)
  cron.schedule('0,30 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 게임 시작 시간 알림 작업 시작...`);
    
    try {
      const currentTime = new Date();
      
      // 현재 시간부터 5분 후까지 시작하는 게임들 조회
      const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60 * 1000);
      
      console.log(`현재 시간: ${currentTime.toISOString()}`);
      console.log(`5분 후: ${fiveMinutesLater.toISOString()}`);
      
      // 게임 시작 시간 알림 설정이 활성화된 사용자들 조회
      const startTimeUsers = await prisma.notificationSetting.findMany({
        where: {
          OR: [
            {
              participatingGameEnabled: true,
              participatingGameMeetingStartEnabled: true
            },
            {
              myGamePostEnabled: true,
              myGamePostMeetingStartEnabled: true
            }
          ]
        },
        include: {
          user: true
        }
      });
      
      // 현재 시간부터 5분 후까지 시작하는 게임들 조회
      const startingGames = await prisma.gamePost.findMany({
        where: {
          status: 'OPEN',
          startTime: {
            gte: currentTime,
            lte: fiveMinutesLater
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
      
      console.log(`시작하는 게임: ${startingGames.length}개`);
      
      // 게임 시작 알림 발송
      for (const game of startingGames) {
        await sendGameStartNotifications(game, startTimeUsers);
      }
      
      console.log(`[${new Date().toISOString()}] 게임 시작 시간 알림 작업 완료`);
    } catch (error) {
      console.error('게임 시작 시간 알림 작업 중 오류 발생:', error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  console.log('게임 시작 시간 알림 스케줄러가 성공적으로 시작되었습니다.');
}

// 게임 시작 알림 발송 함수
async function sendGameStartNotifications(
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
    participatingGameMeetingStartEnabled: boolean;
    participatingGameMeetingStartOnlyFull: boolean;
    myGamePostEnabled: boolean;
    myGamePostMeetingStartEnabled: boolean;
    myGamePostMeetingStartOnlyFull: boolean;
  }>
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
          userSetting.participatingGameMeetingStartEnabled) {
        
        // 모임이 다 모였을 때만 알림 설정이 활성화되어 있다면 확인
        if (userSetting.participatingGameMeetingStartOnlyFull && !isFull) {
          continue;
        }
        
        shouldNotify = true;
      }
    }
    
    if (isAuthor) {
      // 작성자 알림 설정 확인
      if (userSetting.myGamePostEnabled && 
          userSetting.myGamePostMeetingStartEnabled) {
        
        // 모임이 다 모였을 때만 알림 설정이 활성화되어 있다면 확인
        if (userSetting.myGamePostMeetingStartOnlyFull && !isFull) {
          continue;
        }
        
        shouldNotify = true;
      }
    }
    
    if (!shouldNotify) continue;
    
    // 알림 발송
    try {
      const gameName = game.game?.name || game.customGameName || '게임';
      const title = `${gameName} 게임 시작!`;
      const body = isAuthor 
        ? `내가 작성한 "${game.title}" 게임이 시작되었습니다!`
        : `참여한 "${game.title}" 게임이 시작되었습니다!`;
      
      await createAndSendNotification({
        type: 'GAME_START',
        title,
        body,
        recipientId: user.userId,
        gamePostId: game.id,
        priority: 'HIGH',
        data: {
          gameId: game.gameId || undefined,
          gameName,
          startTime: gameStartTime.toISOString(),
          isFull,
          isAuthor
        },
        context: {
          userId: user.userId,
          gameId: game.gameId || undefined,
          additionalData: {
            isAuthor,
            isFull
          }
        }
      });
      
      console.log(`게임 시작 알림 발송 완료: ${user.name} - ${game.title}`);
    } catch (error) {
      console.error(`게임 시작 알림 발송 실패: ${user.name} - ${game.title}`, error);
    }
  }
}

// 스케줄러 중지 함수
export function stopGameStartTimeNotification() {
  console.log('게임 시작 시간 알림 스케줄러를 중지합니다...');
  cron.getTasks().forEach((task) => {
    const status = task.getStatus();
    if (typeof status === 'string' && status === 'scheduled') {
      task.stop();
    }
  });
  console.log('게임 시작 시간 알림 스케줄러가 중지되었습니다.');
}
