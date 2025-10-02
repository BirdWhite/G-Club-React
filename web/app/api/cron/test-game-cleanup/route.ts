import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    console.log('수동 게임글 정리 작업 시작...');
    
    // Supabase 클라이언트 생성 (Service Role Key 사용)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const currentTime = new Date();
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
    
    console.log(`현재 시간: ${currentTime.toISOString()}`);
    console.log(`6시간 전 시간: ${sixHoursAgo.toISOString()}`);
    
    const results = {
      fullToProgress: 0,
      inProgressToCompleted: 0,
      openToExpired: 0,
      totalProcessed: 0
    };
    
    // ===== 1단계: 게임 시작 시간이 현재 시간과 같거나 이전인 FULL 상태 글을 IN_PROGRESS로 변경 =====
    console.log('1단계: 게임 시작 처리 중...');
    const { data: fullPosts, error: fullError } = await supabase
      .from('GamePost')
      .select('id, title, startTime, status, isFull')
      .eq('isFull', true)
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
      
      results.fullToProgress = progressResult?.length || 0;
      console.log(`${results.fullToProgress}개의 게임글을 IN_PROGRESS 상태로 변경했습니다.`);
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
      
      results.inProgressToCompleted = completedResult?.length || 0;
      console.log(`${results.inProgressToCompleted}개의 게임글을 COMPLETED 상태로 변경했습니다.`);
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
      
      results.openToExpired = expiredResult?.length || 0;
      console.log(`${results.openToExpired}개의 게임글을 EXPIRED 상태로 변경했습니다.`);
    }
    
    results.totalProcessed = results.fullToProgress + results.inProgressToCompleted + results.openToExpired;
    
    if (results.totalProcessed === 0) {
      console.log('처리할 게임글이 없습니다.');
    }
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `총 ${results.totalProcessed}개의 게임글을 처리했습니다.`
    });
    
  } catch (error) {
    console.error('게임글 정리 작업 중 오류 발생:', error);
    return NextResponse.json(
      { error: '게임글 정리 작업 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
