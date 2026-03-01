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

    // 모든 게임을 order로 정렬하여 가져오기 (order가 같을 경우 id로 2차 정렬하여 일관성 확보)
    const allGames = await prisma.game.findMany({
      orderBy: [
        { order: 'asc' },
        { id: 'asc' }
      ]
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

    // 이동할 게임을 배열에서 제거 후 목표 위치에 삽입
    const reorderedGames = [...allGames];
    const [movedGame] = reorderedGames.splice(currentIndex, 1);
    reorderedGames.splice(targetIndex, 0, movedGame);

    // 1부터 순차적으로 order 값 재할당 (갭/중복 제거로 안정적 동작 보장)
    await prisma.$transaction(
      reorderedGames.map((game, index) =>
        prisma.game.update({
          where: { id: game.id },
          data: { order: index + 1 }
        })
      )
    );

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
