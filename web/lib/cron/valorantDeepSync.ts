import cron from 'node-cron';
import { processDeepSyncQueue, hasDeepSyncQueue } from '@/actions/valorantCron';

let cronJob: ReturnType<typeof cron.schedule> | null = null;
let isLoopRunning = false; // 루프 실행 중 여부

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

interface DeepSyncResult {
  success: boolean;
  retryable?: boolean;
  message?: string;
  status?: number;
  newMatchesCount?: number;
  apiCallCount?: number;
}

/**
 * 10분마다 실행되는 체크 로직:
 * ① 루프가 이미 돌고 있으면 → 아무것도 안 함
 * ② 대기열 없으면 → 다음 체크까지 대기
 * ③ 대기열 있으면 → 빌 때까지 연속 처리 후 종료
 */
async function checkAndRun() {
  // ① 이미 처리 중이면 건드리지 않음
  if (isLoopRunning) {
    console.log('[CRON] 딥싱크 인스턴스가 실행 중입니다. 아무 행동 안함.');
    return;
  }

  // ② 대기열 확인
  const queueExists = await hasDeepSyncQueue();
  if (!queueExists) {
    console.log('[CRON] 대기열 없음. 다음 체크까지 대기.');
    return;
  }

  // ③ 인스턴스 시작 → 대기열 빌 때까지 루프
  isLoopRunning = true;
  console.log('[CRON] 대기열 감지 → 연속 처리 인스턴스 시작...');
  try {
    while (true) {
      const stillHasQueue = await hasDeepSyncQueue();
      if (!stillHasQueue) {
        console.log('[CRON] 대기열 소진 완료. 인스턴스 종료.');
        break;
      }
      
      // processDeepSyncQueue의 결과를 받아 처리 결정
      const result = await processDeepSyncQueue() as DeepSyncResult;
      
      if (result && !result.success) {
        if (result.retryable) {
          // 429 에러 등 리트라이 가능한 상황이면 길게 대기 (예: 1분)
          console.log(`[CRON] 리트라이 가능한 에러 발생 (${result.message}). 1분 대기 후 계속...`);
          await delay(60000);
        } else {
          // 치명적 에러면 루프 중단
          console.log(`[CRON] 치명적 에러 발생 (${result.message}). 인스턴스 종료.`);
          break;
        }
      }

      // 루프 간 최소 지연 시간 (1초) - 좀비화 방지 및 CPU 부하 경감
      await delay(1000);
    }
  } catch (error) {
    console.error('[CRON] 딥싱크 루프 오류 → 인스턴스 종료:', error);
  } finally {
    isLoopRunning = false;
  }
}

export function startValorantDeepSync(): void {
  if (cronJob) {
    return; // 이미 시작됨
  }

  console.log('[CRON] 발로란트 딥싱크 스케줄러 시작.');

  // 서버 시작 즉시 첫 체크 실행
  checkAndRun();

  // 이후 10분마다 반복 (서버 시작 기준 상대 시간)
  cronJob = cron.schedule('*/10 * * * *', () => {
    checkAndRun();
  });
}
