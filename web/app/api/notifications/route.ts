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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const skip = (page - 1) * limit;

    // 사용자의 알림 수신 내역 조회
    const whereClause = {
      userId: user.id,
      ...(unreadOnly && { isRead: false })
    };

    const [receipts, totalCount] = await Promise.all([
      prisma.notificationReceipt.findMany({
        where: whereClause,
        include: {
          notification: {
            include: {
              sender: {
                select: {
                  userId: true,
                  name: true,
                  image: true
                }
              },
              gamePost: {
                select: {
                  id: true,
                  title: true,
                  game: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.notificationReceipt.count({
        where: whereClause
      })
    ]);

    // 읽지 않은 알림 개수
    const unreadCount = await prisma.notificationReceipt.count({
      where: {
        userId: user.id,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      notifications: receipts.map(receipt => ({
        id: receipt.id,
        notificationId: receipt.notificationId,
        title: receipt.notification.title,
        body: receipt.notification.body,
        icon: receipt.notification.icon,
        actionUrl: receipt.notification.actionUrl,
        type: receipt.notification.type,
        sender: receipt.notification.sender ? {
          userId: receipt.notification.sender.userId,
          nickname: receipt.notification.sender.name,
          profileImage: receipt.notification.sender.image
        } : undefined,
        gamePost: receipt.notification.gamePost,
        isRead: receipt.isRead,
        readAt: receipt.readAt,
        isClicked: receipt.isClicked,
        clickedAt: receipt.clickedAt,
        createdAt: receipt.createdAt,
        priority: receipt.notification.priority
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      unreadCount
    });

  } catch (error) {
    console.error('알림 목록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}