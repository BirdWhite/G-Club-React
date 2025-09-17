import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// 사용자의 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    const skip = (page - 1) * limit;

    // 알림 조회 조건 구성
    const whereCondition: any = {
      OR: [
        // 개별 수신 알림
        { recipientId: user.id },
        // 그룹 발송 알림 (receipt가 있는 것만)
        {
          isGroupSend: true,
          receipts: {
            some: {
              userId: user.id
            }
          }
        }
      ]
    };

    if (type) {
      whereCondition.type = type;
    }

    // 읽지 않은 알림만 조회하는 경우
    if (unreadOnly) {
      whereCondition.receipts = {
        some: {
          userId: user.id,
          isRead: false
        }
      };
    }

    // 알림 목록 조회
    const notifications = await prisma.notification.findMany({
      where: whereCondition,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        gamePost: {
          select: {
            id: true,
            title: true
          }
        },
        receipts: {
          where: {
            userId: user.id
          },
          select: {
            isRead: true,
            readAt: true,
            isClicked: true,
            clickedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // 총 개수 조회
    const totalCount = await prisma.notification.count({
      where: whereCondition
    });

    // 읽지 않은 알림 개수 조회
    const unreadCount = await prisma.notification.count({
      where: {
        ...whereCondition,
        receipts: {
          some: {
            userId: user.id,
            isRead: false
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      notifications: notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        actionUrl: notification.actionUrl,
        priority: notification.priority,
        createdAt: notification.createdAt,
        sender: notification.sender,
        gamePost: notification.gamePost,
        receipt: notification.receipts[0] || null
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: skip + limit < totalCount,
        hasPrev: page > 1
      },
      unreadCount
    });
  } catch (error) {
    console.error('알림 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 알림 발송 (관리자용)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    // 관리자 권한 확인 (필요시)
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
        { error: '알림 발송 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const {
      type,
      title,
      body,
      icon,
      actionUrl,
      priority = 'NORMAL',
      recipientId,
      isGroupSend = false,
      groupType,
      groupFilter,
      gamePostId,
      scheduledAt,
      data
    } = await request.json();

    if (!type || !title || !body) {
      return NextResponse.json(
        { error: '알림 타입, 제목, 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    // 알림 생성
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        body,
        icon,
        actionUrl,
        priority,
        senderId: user.id,
        recipientId: !isGroupSend ? recipientId : null,
        isGroupSend,
        groupType: isGroupSend ? groupType : null,
        groupFilter: isGroupSend ? groupFilter : null,
        gamePostId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        data,
        status: scheduledAt ? 'PENDING' : 'SENT',
        sentAt: scheduledAt ? null : new Date()
      }
    });

    // 개별 발송인 경우 receipt 생성
    if (!isGroupSend && recipientId) {
      await prisma.notificationReceipt.create({
        data: {
          notificationId: notification.id,
          userId: recipientId
        }
      });
    }

    // 그룹 발송인 경우 대상 사용자들에게 receipt 생성
    if (isGroupSend) {
      let targetUsers: string[] = [];

      switch (groupType) {
        case 'ALL_USERS':
          const allUsers = await prisma.userProfile.findMany({
            select: { userId: true }
          });
          targetUsers = allUsers.map(u => u.userId);
          break;
        
        case 'ROLE_BASED':
          if (groupFilter?.roleId) {
            const roleUsers = await prisma.userProfile.findMany({
              where: { roleId: groupFilter.roleId },
              select: { userId: true }
            });
            targetUsers = roleUsers.map(u => u.userId);
          }
          break;
        
        case 'GAME_PARTICIPANTS':
          if (gamePostId) {
            const participants = await prisma.gameParticipant.findMany({
              where: { gamePostId },
              select: { userId: true }
            });
            targetUsers = participants.map(p => p.userId!).filter(Boolean);
          }
          break;
      }

      // 대상 사용자들에게 receipt 생성
      if (targetUsers.length > 0) {
        await prisma.notificationReceipt.createMany({
          data: targetUsers.map(userId => ({
            notificationId: notification.id,
            userId
          })),
          skipDuplicates: true
        });
      }
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        status: notification.status
      }
    });
  } catch (error) {
    console.error('알림 발송 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
