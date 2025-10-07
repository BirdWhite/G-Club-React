// 크론 잡 공통 관리자
import { startGamePostCleanup } from './gamePostCleanup';
import { startNotificationCleanup } from './notificationCleanup';
import { startGameStartNotification } from './gameStartNotification';
import { startGameStartTimeNotification } from './gameStartTimeNotification';

// 전역 변수로 크론 작업 시작 상태 관리
declare global {
  var __cronJobsInitialized: boolean | undefined;
}

// global 객체의 타입 정의
interface GlobalWithCronJobs {
  __cronJobsInitialized?: boolean;
}

// 서버 시작 시 자동으로 크론 작업 초기화
if (typeof window === 'undefined' && !(global as GlobalWithCronJobs).__cronJobsInitialized) {
  (global as GlobalWithCronJobs).__cronJobsInitialized = true;
  
  // 환경 변수로 크론 작업 활성화/비활성화 제어
  if (process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production') {
    console.log('서버 시작: 크론 작업을 자동 초기화합니다...');
    
    // 게임 포스트 정리 크론 잡
    startGamePostCleanup();
    
    // 알림 정리 크론 잡
    startNotificationCleanup();
    
    // 게임 시작 전 알림 크론 잡
    startGameStartNotification();
    
    // 게임 시작 시간 알림 크론 잡
    startGameStartTimeNotification();
    
    console.log('서버 시작: 모든 크론 작업이 성공적으로 시작되었습니다.');
  } else {
    console.log('서버 시작: 크론 작업이 비활성화되어 있습니다. (ENABLE_CRON_JOBS=true로 설정하여 활성화)');
  }
}

/**
 * 모든 크론 잡을 수동으로 초기화합니다 (서버 시작 시 자동 초기화됨)
 * @param includeNotificationCleanup - 알림 정리 크론 잡 포함 여부 (기본값: true)
 */
export function initializeCronJobs(includeNotificationCleanup: boolean = true): void {
  // 서버 사이드에서만 실행 (브라우저에서는 실행되지 않음)
  if (typeof window === 'undefined') {
    // 이미 초기화되었는지 확인
    if ((global as GlobalWithCronJobs).__cronJobsInitialized) {
      console.log('크론 작업이 이미 초기화되어 있습니다. (중복 시작 방지)');
      return;
    }
    
    (global as GlobalWithCronJobs).__cronJobsInitialized = true;
    
    // 환경 변수로 크론 작업 활성화/비활성화 제어
    if (process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production') {
      console.log('수동 크론 작업 초기화...');
      
      // 게임 포스트 정리 크론 잡
      startGamePostCleanup();
      
      // 알림 정리 크론 잡 (선택적)
      if (includeNotificationCleanup) {
        startNotificationCleanup();
      }
      
      // 게임 시작 전 알림 크론 잡
      startGameStartNotification();
      
      // 게임 시작 시간 알림 크론 잡
      startGameStartTimeNotification();
      
      console.log('수동 크론 작업이 성공적으로 시작되었습니다.');
    } else {
      console.log('크론 작업이 비활성화되어 있습니다. (ENABLE_CRON_JOBS=true로 설정하여 활성화)');
    }
  }
}

/**
 * 크론 잡이 시작되었는지 확인합니다
 */
export function isCronJobsStarted(): boolean {
  return (global as GlobalWithCronJobs).__cronJobsInitialized === true;
}

/**
 * 크론 잡을 중지합니다 (개발/테스트용)
 */
export function stopCronJobs(): void {
  (global as GlobalWithCronJobs).__cronJobsInitialized = false;
  console.log('크론 작업이 중지되었습니다.');
}
