import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase/server';
import prisma from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'notificationId가 필요합니다' },
        { status: 400 }
      );
    }

    // 사용자의 NotificationReceipt 찾기
    const receipt = await prisma.notificationReceipt.findFirst({
      where: {
        notificationId,
        userId: user.id
      },
      select: {
        id: true
      }
    });

    console.log(`[receipt-api] Receipt 조회 결과:`, {
      notificationId,
      userId: user.id,
      receipt: receipt ? { id: receipt.id } : null
    });

    if (!receipt) {
      console.log(`[receipt-api] Receipt를 찾을 수 없음: notificationId=${notificationId}, userId=${user.id}`);
      
      // 디버깅을 위해 해당 notificationId의 모든 receipt 확인
      const allReceipts = await prisma.notificationReceipt.findMany({
        where: { notificationId },
        select: { id: true, userId: true }
      });
      console.log(`[receipt-api] 해당 notificationId의 모든 receipt:`, allReceipts);
      
      return NextResponse.json(
        { success: false, error: '알림 수신 내역을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      receiptId: receipt.id
    });

  } catch (error) {
    console.error('Receipt 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
