// 서버 사이드에서만 크론 작업을 시작하는 초기화 파일
import { startGamePostCleanup } from './gamePostCleanup';
import { startNotificationCleanup } from './notificationCleanup';

// 전역 변수로 스케줄러 시작 상태 관리
declare global {
  var __cronSchedulerStarted: boolean | undefined;
  var __cronSchedulerInstance: unknown | undefined;
}

// 서버 사이드에서만 실행 (브라우저에서는 실행되지 않음)
if (typeof window === 'undefined') {
  // 스케줄러가 이미 시작되지 않았을 때만 시작
  if (!global.__cronSchedulerStarted) {
    global.__cronSchedulerStarted = true;
    
    // 환경 변수로 크론 작업 활성화/비활성화 제어
    if (process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production') {
      // 개발 모드에서는 더 엄격한 중복 방지
      if (process.env.NODE_ENV === 'development') {
        console.log('개발 모드: 크론 작업을 시작합니다. (HMR로 인한 중복 시작 방지)');
      }
      startGamePostCleanup();
      startNotificationCleanup();
    } else {
      console.log('크론 작업이 비활성화되어 있습니다. (ENABLE_CRON_JOBS=true로 설정하여 활성화)');
    }
  } else {
    // 이미 시작된 경우 로그 출력 (개발 모드에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('크론 스케줄러가 이미 시작되어 있습니다. (HMR로 인한 중복 시작 방지)');
    }
  }
}
