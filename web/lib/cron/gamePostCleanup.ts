import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

export function startGamePostCleanup() {
  console.log('게임메이트 글 정리 스케줄러를 시작합니다...');
  
  // Supabase 클라이언트 생성 (Service Role Key 사용)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! // RLS 우회를 위한 Service Role Key
  );
  
  // 매시간 정각과 30분에 실행 (0분 0초, 30분 0초)
  cron.schedule('0,30 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 게임메이트 글 정리 작업 시작...`);
    
    try {
      const currentTime = new Date();
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
      
      console.log(`현재 시간: ${currentTime.toISOString()}`);
      console.log(`6시간 전 시간: ${sixHoursAgo.toISOString()}`);
      
      // ===== 1단계: 게임 시작 시간이 현재 시간과 같거나 이전인 FULL 상태 글을 IN_PROGRESS로 변경 =====
      console.log('1단계: 게임 시작 처리 중...');
      const { data: fullPosts, error: fullError } = await supabase
        .from('GamePost')
        .select('id, title, startTime, status')
        .eq('status', 'FULL')
        .lte('startTime', currentTime.toISOString());
      
      if (fullError) {
        throw fullError;
      }
      
      if (fullPosts && fullPosts.length > 0) {
        console.log(`게임 시작할 FULL 상태 글 ${fullPosts.length}개 발견:`);
        fullPosts.forEach(post => {
          console.log(`- ID: ${post.id}, 제목: ${post.title}, 시작시간: ${post.startTime}`);
        });
        
        const { data: progressResult, error: progressError } = await supabase
          .from('GamePost')
          .update({ status: 'IN_PROGRESS' })
          .in('id', fullPosts.map(post => post.id))
          .select('id');
        
        if (progressError) {
          throw progressError;
        }
        
        console.log(`${progressResult?.length || 0}개의 게임글을 IN_PROGRESS 상태로 변경했습니다.`);
      } else {
        console.log('게임 시작할 FULL 상태 글이 없습니다.');
      }
      
      // ===== 2단계: 6시간 지난 글들 정리 =====
      console.log('2단계: 6시간 지난 글들 정리 중...');
      
      // IN_PROGRESS 상태인 글들을 COMPLETED로 변경
      const { data: inProgressPosts, error: inProgressError } = await supabase
        .from('GamePost')
        .select('id, title, startTime, status')
        .eq('status', 'IN_PROGRESS')
        .lt('startTime', sixHoursAgo.toISOString());
      
      if (inProgressError) {
        throw inProgressError;
      }
      
      if (inProgressPosts && inProgressPosts.length > 0) {
        console.log(`완료할 IN_PROGRESS 상태 글 ${inProgressPosts.length}개 발견:`);
        inProgressPosts.forEach(post => {
          console.log(`- ID: ${post.id}, 제목: ${post.title}, 시작시간: ${post.startTime}`);
        });
        
        const { data: completedResult, error: completedError } = await supabase
          .from('GamePost')
          .update({ status: 'COMPLETED' })
          .in('id', inProgressPosts.map(post => post.id))
          .select('id');
        
        if (completedError) {
          throw completedError;
        }
        
        console.log(`${completedResult?.length || 0}개의 게임글을 COMPLETED 상태로 변경했습니다.`);
      }
      
      // OPEN 상태인 글들을 EXPIRED로 변경
      const { data: openPosts, error: openError } = await supabase
        .from('GamePost')
        .select('id, title, startTime, status')
        .eq('status', 'OPEN')
        .lt('startTime', sixHoursAgo.toISOString());
      
      if (openError) {
        throw openError;
      }
      
      if (openPosts && openPosts.length > 0) {
        console.log(`만료할 OPEN 상태 글 ${openPosts.length}개 발견:`);
        openPosts.forEach(post => {
          console.log(`- ID: ${post.id}, 제목: ${post.title}, 시작시간: ${post.startTime}`);
        });
        
        const { data: expiredResult, error: expiredError } = await supabase
          .from('GamePost')
          .update({ status: 'EXPIRED' })
          .in('id', openPosts.map(post => post.id))
          .select('id');
        
        if (expiredError) {
          throw expiredError;
        }
        
        console.log(`${expiredResult?.length || 0}개의 게임글을 EXPIRED 상태로 변경했습니다.`);
      }
      
      if ((!inProgressPosts || inProgressPosts.length === 0) && (!openPosts || openPosts.length === 0)) {
        console.log('6시간 지난 게임글이 없습니다.');
      }
      
    } catch (error) {
      console.error('게임글 정리 작업 중 오류 발생:', error);
    }
    
    console.log(`[${new Date().toISOString()}] 게임메이트 글 정리 작업 완료`);
  }, {
    timezone: "Asia/Seoul"
  });
  
  console.log('게임메이트 글 정리 스케줄러가 성공적으로 시작되었습니다. (매시간 정각과 30분 실행)');
}

// 스케줄러 중지 함수 (필요시 사용)
export function stopGamePostCleanup() {
  console.log('게임메이트 글 정리 스케줄러를 중지합니다...');
  cron.getTasks().forEach((task) => {
    const status = task.getStatus();
    if (typeof status === 'string' && status === 'scheduled') {
      task.stop();
    }
  });
  console.log('게임메이트 글 정리 스케줄러가 중지되었습니다.');
}
