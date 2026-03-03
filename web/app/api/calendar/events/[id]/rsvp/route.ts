import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

export async function POST(
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
      include: { _count: { select: { rsvps: true } } },
    });

    if (!event) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (event.status === 'CANCELLED') {
      return NextResponse.json({ error: '취소된 일정입니다.' }, { status: 400 });
    }

    const body = await request.json();
    const { status, comment } = body;

    if (!['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 RSVP 상태입니다.' }, { status: 400 });
    }

    if (
      status === 'ACCEPTED' &&
      event.maxParticipants !== null
    ) {
      const acceptedCount = await prisma.eventRsvp.count({
        where: { eventId: id, status: 'ACCEPTED', userId: { not: user.id } },
      });
      if (acceptedCount >= event.maxParticipants) {
        return NextResponse.json({ error: '최대 참석 인원에 도달했습니다.' }, { status: 400 });
      }
    }

    const rsvp = await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      update: {
        status,
        comment: comment?.trim() || null,
        respondedAt: new Date(),
      },
      create: {
        eventId: id,
        userId: user.id,
        status,
        comment: comment?.trim() || null,
        respondedAt: new Date(),
      },
      include: {
        user: {
          select: { userId: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ success: true, rsvp });
  } catch (error) {
    console.error('RSVP 등록 오류:', error);
    return NextResponse.json(
      { error: 'RSVP 처리 중 오류가 발생했습니다.' },
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

    const { id } = await params;

    const existing = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'RSVP를 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.eventRsvp.delete({
      where: { eventId_userId: { eventId: id, userId: user.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RSVP 삭제 오류:', error);
    return NextResponse.json(
      { error: 'RSVP 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
