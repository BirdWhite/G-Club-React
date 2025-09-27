import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';

export async function GET() {
  try {
    // Supabase 클라이언트 생성
    const supabase = await createServerClient();
    
    // Edge Function 호출
    const { data, error } = await supabase.functions.invoke('update-post-status', {
      body: {},
    });

    if (error) {
      console.error('Edge Function 호출 실패:', error);
      return NextResponse.json({ 
        error: '게시글 상태 업데이트 중 오류가 발생했습니다.',
        details: error 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '게시글 상태가 성공적으로 업데이트되었습니다.',
      data: data
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 