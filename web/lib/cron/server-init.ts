// 서버 시작 시 한 번만 실행되는 크론 작업 초기화
import { startGamePostCleanup } from './gamePostCleanup';

// 전역 변수로 스케줄러 시작 상태 관리
declare global {
  var __cronSchedulerStarted: boolean | undefined;
}

// 서버 시작 시 한 번만 실행
if (typeof window === 'undefined' && !global.__cronSchedulerStarted) {
  global.__cronSchedulerStarted = true;
  
  // 환경 변수로 크론 작업 활성화/비활성화 제어
  if (process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production') {
    console.log('서버 시작: 크론 작업을 초기화합니다...');
    startGamePostCleanup();
  } else {
    console.log('크론 작업이 비활성화되어 있습니다. (ENABLE_CRON_JOBS=true로 설정하여 활성화)');
  }
}
