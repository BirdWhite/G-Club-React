import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;
    
    if (!userId || !subscription) {
      return NextResponse.json(
        { error: '사용자 ID와 구독 정보가 필요합니다' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 먼저 해당 사용자가 존재하는지 확인
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Prisma upsert를 사용하여 구독 정보 생성/업데이트
    await prisma.pushSubscription.upsert({
      where: { userId },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isEnabled: true,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isEnabled: true,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('푸시 구독 저장 오류:', error);
    return NextResponse.json(
      { error: '구독 정보 저장에 실패했습니다' },
      { status: 500 }
    );
  }
}
