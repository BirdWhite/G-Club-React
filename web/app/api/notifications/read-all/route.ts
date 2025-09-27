import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase/server';
import prisma from '@/lib/database/prisma';

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 사용자의 모든 읽지 않은 알림을 읽음 처리
    const result = await prisma.notificationReceipt.updateMany({
      where: {
        userId: user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 알림을 읽음 처리했습니다`,
      count: result.count
    });

  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
