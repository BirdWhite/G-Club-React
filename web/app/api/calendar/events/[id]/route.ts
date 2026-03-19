import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { userId: true, name: true, image: true },
        },
        rsvps: {
          include: {
            user: {
              select: { userId: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { rsvps: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
    }

    const myRsvp = event.rsvps.find((r) => r.userId === user.id) ?? null;
    const isAdmin = isAdmin_Server(user.role);

    return NextResponse.json({
      success: true,
      event: { ...event, myRsvp, isAdmin },
    });
  } catch (error) {
    console.error('일정 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '일정을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!profile?.role || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role.name)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      location,
      category,
      status,
      startAt,
      endAt,
      isAllDay,
      url,
      maxParticipants,
      color,
    } = body;

    if (title !== undefined && title.trim().length === 0) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
    }

    const start = startAt ? new Date(startAt) : undefined;
    const end = endAt ? new Date(endAt) : undefined;

    if (start && end && end <= start) {
      return NextResponse.json({ error: '종료 시간은 시작 시간 이후여야 합니다.' }, { status: 400 });
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim() ?? undefined,
        location: location?.trim() ?? undefined,
        category: category ?? undefined,
        status: status ?? undefined,
        startAt: start,
        endAt: end,
        isAllDay: isAllDay ?? undefined,
        url: url?.trim() ?? undefined,
        maxParticipants: maxParticipants !== undefined ? (maxParticipants ? parseInt(maxParticipants) : null) : undefined,
        color: color ?? undefined,
        sequence: { increment: 1 },
      },
      include: {
        organizer: {
          select: { userId: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('일정 수정 오류:', error);
    return NextResponse.json(
      { error: '일정 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!profile?.role || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role.name)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        rsvps: {
          where: { status: { not: 'DECLINED' } },
          select: { userId: true },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.calendarEvent.update({
      where: { id },
      data: { status: 'CANCELLED', sequence: { increment: 1 } },
    });

    // 취소 알림 발송
    try {
      const affectedUserIds = existing.rsvps.map((r) => r.userId);
      if (affectedUserIds.length > 0) {
        const notification = await prisma.notification.create({
          data: {
            type: 'CALENDAR_EVENT_CANCELLED',
            title: '일정이 취소되었습니다',
            body: existing.title,
            icon: '/icons/maskable_icon_x512.png',
            actionUrl: `/calendar/${id}`,
            calendarEventId: id,
            isGroupSend: true,
            groupType: 'EVENT_RSVP_USERS',
            status: 'PENDING',
            priority: 'HIGH',
            data: { eventId: id, eventTitle: existing.title },
          },
        });

        await prisma.notificationReceipt.createMany({
          data: affectedUserIds.map((userId) => ({
            notificationId: notification.id,
            userId,
          })),
        });

        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } catch (notificationError) {
      console.error('일정 취소 알림 발송 실패:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('일정 삭제 오류:', error);
    return NextResponse.json(
      { error: '일정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
