// Next.js 서버 시작 시 자동으로 실행되는 파일
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 서버 사이드에서만 실행
    console.log('🚀 서버 시작: 크론 작업을 초기화합니다...');
    
    try {
      // 크론 매니저 동적 import
      const { initializeCronJobs } = await import('./lib/cron/cronManager');
      
      // 크론 작업 초기화
      initializeCronJobs();
      
      console.log('✅ 서버 시작: 모든 크론 작업이 성공적으로 시작되었습니다.');
    } catch (error) {
      console.error('❌ 서버 시작: 크론 작업 초기화 중 오류 발생:', error);
    }
  }
}
