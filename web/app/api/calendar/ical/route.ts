import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { generateCalendarFeed } from '@/lib/calendar/icalHelper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse('token 파라미터가 필요합니다.', { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: token },
    });

    if (!profile) {
      return new NextResponse('유효하지 않은 토큰입니다.', { status: 401 });
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        status: { not: 'CANCELLED' },
        startAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      include: {
        organizer: {
          select: { userId: true, name: true, email: true },
        },
        rsvps: {
          include: {
            user: {
              select: { userId: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    const icsContent = generateCalendarFeed(events);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gclub-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('iCal 피드 생성 오류:', error);
    return new NextResponse('iCal 피드 생성 중 오류가 발생했습니다.', { status: 500 });
  }
}
