import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 구독 정보 삭제
    const { error } = await supabase
      .from('PushSubscription')
      .delete()
      .eq('userId', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('푸시 구독 해제 오류:', error);
    return NextResponse.json(
      { error: '구독 해제에 실패했습니다' },
      { status: 500 }
    );
  }
}
