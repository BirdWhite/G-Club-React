import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase/server';
import prisma from '@/lib/database/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { id: receiptId } = await params;

    // 알림 수신 내역 확인 및 읽음 처리
    const receipt = await prisma.notificationReceipt.findFirst({
      where: {
        id: receiptId,
        userId: user.id
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: '알림을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 읽은 경우
    if (receipt.isRead) {
      return NextResponse.json({
        success: true,
        message: '이미 읽은 알림입니다'
      });
    }

    // 읽음 처리
    await prisma.notificationReceipt.update({
      where: {
        id: receiptId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: '알림을 읽음 처리했습니다'
    });

  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
