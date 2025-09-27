import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 사용자의 푸시 구독 정보 확인
    const pushSubscription = await prisma.pushSubscription.findUnique({
      where: {
        userId: userId
      }
    });

    return NextResponse.json({
      success: true,
      hasSubscription: !!pushSubscription
    });

  } catch (error) {
    console.error('푸시 구독 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}