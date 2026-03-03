import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      status: { not: 'CANCELLED' },
    };

    if (startDate && endDate) {
      whereClause.startAt = { gte: new Date(startDate) };
      whereClause.endAt = { lte: new Date(endDate) };
    } else if (startDate) {
      whereClause.startAt = { gte: new Date(startDate) };
    } else if (endDate) {
      whereClause.endAt = { lte: new Date(endDate) };
    }

    if (category) {
      whereClause.category = category;
    }

    const [events, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: whereClause,
        include: {
          organizer: {
            select: { userId: true, name: true, image: true },
          },
          _count: { select: { rsvps: true } },
          rsvps: {
            where: { userId: user.id },
            select: { status: true },
          },
        },
        orderBy: { startAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.calendarEvent.count({ where: whereClause }),
    ]);

    const eventsWithMyRsvp = events.map((event) => {
      const myRsvp = event.rsvps[0]?.status ?? null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- rsvps excluded from spread
      const { rsvps, ...rest } = event;
      return { ...rest, myRsvp };
    });

    return NextResponse.json({
      success: true,
      events: eventsWithMyRsvp,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('캘린더 일정 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '일정을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
    }

    if (!startAt || !endAt) {
      return NextResponse.json({ error: '시작 및 종료 시간을 입력해주세요.' }, { status: 400 });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (end <= start) {
      return NextResponse.json({ error: '종료 시간은 시작 시간 이후여야 합니다.' }, { status: 400 });
    }

    const uid = `${uuidv4()}@gclub`;

    const event = await prisma.calendarEvent.create({
      data: {
        uid,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        category: category || 'GENERAL',
        status: status || 'CONFIRMED',
        startAt: start,
        endAt: end,
        isAllDay: isAllDay || false,
        url: url?.trim() || null,
        organizerId: profile.userId,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        color: color || null,
      },
      include: {
        organizer: {
          select: { userId: true, name: true, image: true },
        },
      },
    });

    // 새 일정 알림 발송
    try {
      const usersWithCalendarEnabled = await prisma.userProfile.findMany({
        where: {
          notificationSettings: {
            calendarEventEnabled: true,
            calendarEventNewEnabled: true,
          },
        },
        select: { userId: true },
      });

      if (usersWithCalendarEnabled.length > 0) {
        const notification = await prisma.notification.create({
          data: {
            type: 'CALENDAR_EVENT_NEW',
            title: '새로운 일정이 등록되었습니다',
            body: title.trim(),
            icon: '/icons/calendar.png',
            actionUrl: `/calendar/${event.id}`,
            calendarEventId: event.id,
            isGroupSend: true,
            groupType: 'CALENDAR_SUBSCRIBERS',
            status: 'PENDING',
            priority: 'NORMAL',
            data: { eventId: event.id, eventTitle: title.trim() },
          },
        });

        await prisma.notificationReceipt.createMany({
          data: usersWithCalendarEnabled.map((u) => ({
            notificationId: notification.id,
            userId: u.userId,
          })),
        });

        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } catch (notificationError) {
      console.error('캘린더 일정 알림 발송 실패:', notificationError);
    }

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error('캘린더 일정 생성 오류:', error);
    return NextResponse.json(
      { error: '일정 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
