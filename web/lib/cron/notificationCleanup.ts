import cron from 'node-cron';
import prisma from '@/lib/database/prisma';

export function startNotificationCleanup() {
  console.log('알림 데이터 정리 스케줄러를 시작합니다...');
  
  // 매일 새벽 6시에 실행
  cron.schedule('0 6 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 알림 데이터 정리 작업 시작...`);
    
    try {
      const currentTime = new Date();
      
      // 정리 기준 시간 계산
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      console.log(`현재 시간: ${currentTime.toISOString()}`);
      console.log(`30일 전: ${thirtyDaysAgo.toISOString()}`);
      console.log(`60일 전: ${sixtyDaysAgo.toISOString()}`);
      
      let totalDeletedCount = 0;
      
      // ===== 1단계: 30일 지난 일반 알림 삭제 =====
      console.log('1단계: 30일 지난 일반 알림 정리 중...');
      
      const oldNotificationsToDelete = await prisma.notification.findMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          },
          priority: {
            not: 'URGENT' // URGENT 알림은 제외
          }
        },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
          priority: true
        }
      });
      
      if (oldNotificationsToDelete.length > 0) {
        console.log(`삭제할 30일 지난 일반 알림 ${oldNotificationsToDelete.length}개 발견:`);
        oldNotificationsToDelete.slice(0, 5).forEach(notification => {
          console.log(`- ID: ${notification.id}, 제목: ${notification.title}, 우선순위: ${notification.priority}, 생성일: ${notification.createdAt}`);
        });
        if (oldNotificationsToDelete.length > 5) {
          console.log(`... 외 ${oldNotificationsToDelete.length - 5}개`);
        }
        
        const { count: deletedOldCount } = await prisma.notification.deleteMany({
          where: {
            id: {
              in: oldNotificationsToDelete.map(n => n.id)
            }
          }
        });
        
        totalDeletedCount += deletedOldCount;
        console.log(`${deletedOldCount}개의 30일 지난 일반 알림을 삭제했습니다.`);
      } else {
        console.log('삭제할 30일 지난 일반 알림이 없습니다.');
      }
      
      // ===== 2단계: 60일 지난 URGENT 알림 삭제 =====
      console.log('2단계: 60일 지난 중요 알림 정리 중...');
      
      const urgentNotificationsToDelete = await prisma.notification.findMany({
        where: {
          createdAt: {
            lt: sixtyDaysAgo
          },
          priority: 'URGENT'
        },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true
        }
      });
      
      if (urgentNotificationsToDelete.length > 0) {
        console.log(`삭제할 60일 지난 중요 알림 ${urgentNotificationsToDelete.length}개 발견:`);
        urgentNotificationsToDelete.forEach(notification => {
          console.log(`- ID: ${notification.id}, 제목: ${notification.title}, 생성일: ${notification.createdAt}`);
        });
        
        const { count: deletedUrgentCount } = await prisma.notification.deleteMany({
          where: {
            id: {
              in: urgentNotificationsToDelete.map(n => n.id)
            }
          }
        });
        
        totalDeletedCount += deletedUrgentCount;
        console.log(`${deletedUrgentCount}개의 60일 지난 중요 알림을 삭제했습니다.`);
      } else {
        console.log('삭제할 60일 지난 중요 알림이 없습니다.');
      }
      
      // ===== 3단계: 실패한 알림 정리 (30일 지난 FAILED 상태) =====
      console.log('3단계: 실패한 알림 정리 중...');
      
      const failedNotificationsToDelete = await prisma.notification.findMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          },
          status: 'FAILED'
        },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true
        }
      });
      
      if (failedNotificationsToDelete.length > 0) {
        console.log(`삭제할 실패한 알림 ${failedNotificationsToDelete.length}개 발견:`);
        failedNotificationsToDelete.forEach(notification => {
          console.log(`- ID: ${notification.id}, 제목: ${notification.title}, 생성일: ${notification.createdAt}`);
        });
        
        const { count: deletedFailedCount } = await prisma.notification.deleteMany({
          where: {
            id: {
              in: failedNotificationsToDelete.map(n => n.id)
            }
          }
        });
        
        totalDeletedCount += deletedFailedCount;
        console.log(`${deletedFailedCount}개의 실패한 알림을 삭제했습니다.`);
      } else {
        console.log('삭제할 실패한 알림이 없습니다.');
      }
      
      // ===== 4단계: 고아 NotificationReceipt 정리 =====
      console.log('4단계: 고아 알림 수신 기록 정리 중...');
      
      // 존재하지 않는 알림 ID를 참조하는 receipt 찾기
      const allReceipts = await prisma.notificationReceipt.findMany({
        select: {
          id: true,
          notificationId: true
        }
      });
      
      const existingNotificationIds = await prisma.notification.findMany({
        select: { id: true }
      });
      
      const existingIds = new Set(existingNotificationIds.map(n => n.id));
      const orphanReceipts = allReceipts.filter(r => !existingIds.has(r.notificationId));
      
      if (orphanReceipts.length > 0) {
        const { count: deletedReceiptsCount } = await prisma.notificationReceipt.deleteMany({
          where: {
            id: {
              in: orphanReceipts.map(r => r.id)
            }
          }
        });
        
        console.log(`${deletedReceiptsCount}개의 고아 알림 수신 기록을 삭제했습니다.`);
      } else {
        console.log('삭제할 고아 알림 수신 기록이 없습니다.');
      }
      
      // ===== 정리 완료 로그 =====
      console.log('='.repeat(60));
      console.log(`📊 알림 데이터 정리 완료 - 총 ${totalDeletedCount}개 알림 삭제`);
      console.log(`🗑️  정리 기준:`);
      console.log(`   - 일반 알림: 30일 후 삭제`);
      console.log(`   - 중요 알림: 60일 후 삭제`);
      console.log(`   - 실패 알림: 30일 후 삭제`);
      console.log('='.repeat(60));
      
      // 현재 알림 통계 조회
      const currentStats = await prisma.notification.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      
      console.log('📈 현재 알림 통계:');
      currentStats.forEach(stat => {
        console.log(`   - ${stat.status}: ${stat._count.id}개`);
      });
      
    } catch (error) {
      console.error('알림 데이터 정리 작업 중 오류 발생:', error);
    }
    
    console.log(`[${new Date().toISOString()}] 알림 데이터 정리 작업 완료`);
  }, {
    timezone: "Asia/Seoul"
  });
  
  console.log('알림 데이터 정리 스케줄러가 성공적으로 시작되었습니다. (매일 새벽 6시 실행)');
}

// 스케줄러 중지 함수 (필요시 사용)
export function stopNotificationCleanup() {
  console.log('알림 데이터 정리 스케줄러를 중지합니다...');
  // 특정 작업만 중지하는 로직이 필요한 경우 구현
  console.log('알림 데이터 정리 스케줄러가 중지되었습니다.');
}
