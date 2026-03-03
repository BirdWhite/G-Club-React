import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { generateSingleEventIcs } from '@/lib/calendar/icalHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('로그인이 필요합니다.', { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
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
    });

    if (!event) {
      return new NextResponse('일정을 찾을 수 없습니다.', { status: 404 });
    }

    const icsContent = generateSingleEventIcs(event);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.uid}.ics"`,
      },
    });
  } catch (error) {
    console.error('iCal 다운로드 오류:', error);
    return new NextResponse('iCal 파일 생성 중 오류가 발생했습니다.', { status: 500 });
  }
}
