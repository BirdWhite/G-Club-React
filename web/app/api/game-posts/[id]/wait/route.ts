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
  if (!user.role || user.role === 'NONE') {
    return NextResponse.json({ error: '회원 승인이 완료된 후 이용 가능합니다.' }, { status: 403 });
  }

  const userId = user.id;

  try {
    const { id: gamePostId } = await params;
    
    // 요청 본문이 있는지 확인하고 JSON 파싱
    let availableTime: string | null = null;
    try {
      const body = await request.json();
      availableTime = body.availableTime || null;
    } catch {
      // JSON이 없거나 빈 경우 기본값 사용
      availableTime = null;
    }

    const post = await prisma.gamePost.findUnique({
      where: { id: gamePostId },
      include: {
        participants: { 
          select: { 
            userId: true,
            status: true
          } 
        },
        waitingList: { 
          select: { 
            id: true,
            userId: true,
            status: true
          } 
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (post.authorId === userId) {
      return NextResponse.json({ error: '자신이 생성한 모집글에는 대기할 수 없습니다.' }, { status: 400 });
    }

    // 예비 참가는 OPEN이거나 IN_PROGRESS 상태에서만 가능
    if (post.status !== 'OPEN' && post.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: '예비 참가는 모집 중이거나 게임 진행 중인 글에서만 가능합니다.' }, { status: 400 });
    }

    // 바로 참여 예비 참가 제한 (빈자리가 있으면 불가능)
    if (!availableTime) {
      const currentParticipantsCount = post.participants.filter(p => p.status === 'ACTIVE').length;
      if (currentParticipantsCount < post.maxParticipants) {
        return NextResponse.json({ error: '빈자리가 있는 경우 바로 참여 예비 참가는 불가능합니다. 일반 참여를 이용해주세요.' }, { status: 400 });
      }
    }

    // 시간 예비 참가인 경우 시간 검증
    if (availableTime) {
      const availableDateTime = new Date(availableTime);
      const gameStartTime = new Date(post.startTime);
      
      // 참여 가능 시간이 게임 시작 시간보다 이전이면 오류
      if (availableDateTime <= gameStartTime) {
        return NextResponse.json({ error: '참여 가능 시간은 게임 시작 시간 이후여야 합니다.' }, { status: 400 });
      }
    }

    const isAlreadyParticipant = post.participants.some(p => p.userId === userId && p.status === 'ACTIVE');
    if (isAlreadyParticipant) {
      return NextResponse.json({ error: '이미 참여하고 있는 모집글입니다.' }, { status: 400 });
    }

    // 기존 예비 참여자 레코드 찾기 (데이터베이스에서 직접 조회, 모든 상태 포함)
    const existingWaiting = await prisma.waitingParticipant.findFirst({
      where: {
        gamePostId,
        userId
      }
    });
    
    // INVITED 상태인 경우는 업데이트 불가 (승인 대기 중)
    if (existingWaiting && existingWaiting.status === 'INVITED') {
      return NextResponse.json({ error: '승인 대기 중인 예비 신청이 있습니다. 기존 신청을 취소한 후 다시 신청해주세요.' }, { status: 400 });
    }
    
    // 상태 결정: availableTime이 있으면 TIME_WAITING, 없으면 WAITING
    const waitingStatus = availableTime ? 'TIME_WAITING' : 'WAITING';
    
    if (existingWaiting) {
      // 기존 예비 참여자 레코드 업데이트
      await prisma.waitingParticipant.update({
        where: { id: existingWaiting.id },
        data: {
          status: waitingStatus,
          availableTime,
        },
      });
    } else {
      // 새로운 예비 참여자 생성
      await prisma.waitingParticipant.create({
        data: {
          gamePostId,
          userId,
          availableTime,
          status: waitingStatus,
        },
      });
    }

    return NextResponse.json({ message: '예비 명단에 등록되었습니다.' });
  } catch (error) {
    console.error('예비 명단 등록 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 