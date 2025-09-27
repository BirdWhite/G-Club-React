import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 알림 읽음 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    const { id: notificationId } = await params;
    const { action, isRead, isClicked } = await request.json();

    // 알림이 존재하고 사용자가 접근 가능한지 확인
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { recipientId: user.id },
          {
            isGroupSend: true,
            receipts: {
              some: { userId: user.id }
            }
          }
        ]
      }
    });

    if (!notification) {
      return NextResponse.json(
        { error: '알림을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 알림 수신 상태 업데이트
    const updateData: Record<string, unknown> = {};
    
    if (action === 'mark_read' || isRead !== undefined) {
      updateData.isRead = isRead ?? true;
      if (updateData.isRead && !updateData.readAt) {
        updateData.readAt = new Date();
      }
    }
    
    if (action === 'mark_clicked' || isClicked !== undefined) {
      updateData.isClicked = isClicked ?? true;
      if (updateData.isClicked && !updateData.clickedAt) {
        updateData.clickedAt = new Date();
      }
    }

    // Receipt 업데이트 또는 생성
    await prisma.notificationReceipt.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId: user.id
        }
      },
      update: updateData,
      create: {
        notificationId,
        userId: user.id,
        ...updateData
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('알림 상태 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 알림 삭제 (관리자용)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    const hasAdminPermission = userProfile?.role?.permissions.some(
      p => p.name === 'ADMIN_PANEL_ACCESS' || p.name === 'SYSTEM_SETTINGS'
    );

    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: '알림 삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { id: notificationId } = await params;

    // 알림 삭제 (연관된 receipts도 자동 삭제됨)
    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('알림 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
