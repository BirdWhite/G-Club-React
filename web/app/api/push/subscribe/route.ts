import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, subscription } = await request.json();
    
    if (!userId || !subscription) {
      return NextResponse.json(
        { error: '사용자 ID와 구독 정보가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 기존 구독 정보가 있는지 확인
    const { data: existingSubscription } = await supabase
      .from('PushSubscription')
      .select('id')
      .eq('userId', userId)
      .single();

    if (existingSubscription) {
      // 기존 구독 정보 업데이트
      const { error } = await supabase
        .from('PushSubscription')
        .update({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isEnabled: true,
          updatedAt: new Date().toISOString()
        })
        .eq('userId', userId);

      if (error) throw error;
    } else {
      // 새 구독 정보 생성
      const { error } = await supabase
        .from('PushSubscription')
        .insert({
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isEnabled: true
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('푸시 구독 저장 오류:', error);
    return NextResponse.json(
      { error: '구독 정보 저장에 실패했습니다' },
      { status: 500 }
    );
  }
}
