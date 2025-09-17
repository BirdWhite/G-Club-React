import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 해당 사용자의 구독 정보가 있는지 확인
    const { data: subscription, error } = await supabase
      .from('PushSubscription')
      .select('id, isEnabled')
      .eq('userId', userId)
      .eq('isEnabled', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러
      console.error('구독 확인 쿼리 오류:', error);
      throw error;
    }

    return NextResponse.json({ 
      hasSubscription: !!subscription 
    });
  } catch (error) {
    console.error('푸시 구독 확인 오류:', error);
    return NextResponse.json(
      { error: '구독 확인에 실패했습니다' },
      { status: 500 }
    );
  }
}
