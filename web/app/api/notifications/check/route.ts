import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase/server';
import prisma from '@/lib/database/prisma';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 사용자의 읽지 않은 알림 개수 확인
    const unreadCount = await prisma.notificationReceipt.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      hasNewNotifications: unreadCount > 0,
      unreadCount,
    });

  } catch (error) {
    console.error('알림 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
