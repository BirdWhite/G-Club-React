import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/database/supabase';

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { gameId, direction } = await request.json();

    if (!gameId || !direction) {
      return NextResponse.json({ error: '게임 ID와 방향이 필요합니다.' }, { status: 400 });
    }

    if (!['up', 'down'].includes(direction)) {
      return NextResponse.json({ error: '방향은 up 또는 down이어야 합니다.' }, { status: 400 });
    }

    // 현재 게임 정보 가져오기
    const currentGame = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!currentGame) {
      return NextResponse.json({ error: '게임을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 모든 게임을 order로 정렬하여 가져오기
    const allGames = await prisma.game.findMany({
      orderBy: { order: 'asc' }
    });

    const currentIndex = allGames.findIndex(game => game.id === gameId);
    
    if (currentIndex === -1) {
      return NextResponse.json({ error: '게임을 찾을 수 없습니다.' }, { status: 404 });
    }

    let targetIndex: number;
    if (direction === 'up') {
      targetIndex = currentIndex - 1;
    } else {
      targetIndex = currentIndex + 1;
    }

    // 범위를 벗어나는 경우
    if (targetIndex < 0 || targetIndex >= allGames.length) {
      return NextResponse.json({ error: '더 이상 이동할 수 없습니다.' }, { status: 400 });
    }

    // 두 게임의 order 값을 교환
    const targetGame = allGames[targetIndex];
    
    await prisma.$transaction([
      prisma.game.update({
        where: { id: currentGame.id },
        data: { order: targetGame.order }
      }),
      prisma.game.update({
        where: { id: targetGame.id },
        data: { order: currentGame.order }
      })
    ]);

    return NextResponse.json({ 
      message: '게임 순서가 변경되었습니다.',
      success: true 
    });

  } catch (error) {
    console.error('게임 순서 변경 오류:', error);
    return NextResponse.json(
      { error: '게임 순서 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
