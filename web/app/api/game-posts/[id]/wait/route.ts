import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 예비 명단 등록 (대기 신청)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const userId = user.id;

  try {
    const { id: gamePostId } = await params;
    const { availableTime } = (await request.json()) as { availableTime?: string };

    const post = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        participants: { select: { userId: true } },
        waitingList: { select: { userId: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (post.authorId === userId) {
      return NextResponse.json({ error: '자신이 생성한 모집글에는 대기할 수 없습니다.' }, { status: 400 });
    }

    const isAlreadyParticipant = post.participants.some(p => p.userId === userId);
    if (isAlreadyParticipant) {
      return NextResponse.json({ error: '이미 참여하고 있는 모집글입니다.' }, { status: 400 });
    }

    const isAlreadyWaiting = post.waitingList.some(w => w.userId === userId);
    if (isAlreadyWaiting) {
      return NextResponse.json({ error: '이미 예비 명단에 등록되어 있습니다.' }, { status: 400 });
    }

    await prisma.waitingParticipant.create({
      data: {
        gamePostId,
        userId,
        availableTime,
      },
    });

    return NextResponse.json({ message: '예비 명단에 등록되었습니다.' });
  } catch (error) {
    console.error('예비 명단 등록 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 