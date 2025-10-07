import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 좋아하는 게임 목록 조회
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    // 좋아하는 게임 목록 조회
    const favoriteGames = await prisma.userFavoriteGame.findMany({
      where: { userId: user.id },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            description: true,
            iconUrl: true,
            aliases: true
          }
        }
      },
      orderBy: { order: 'asc' }  // order 값으로만 정렬
    });

    // null order 값들을 자동으로 정리
    const nullOrderItems = favoriteGames.filter(fav => fav.order === null);
    if (nullOrderItems.length > 0) {
      // 현재 최대 order 값 찾기
      const maxOrder = favoriteGames
        .filter(fav => fav.order !== null)
        .reduce((max, fav) => Math.max(max, fav.order || 0), 0);

      // null order 값들을 순차적으로 할당
      let currentOrder = maxOrder;
      for (const item of nullOrderItems) {
        currentOrder++;
        await prisma.userFavoriteGame.update({
          where: { id: item.id },
          data: { order: currentOrder }
        });
      }

      // 업데이트된 데이터 다시 조회
      const updatedFavoriteGames = await prisma.userFavoriteGame.findMany({
        where: { userId: user.id },
        include: {
          game: {
            select: {
              id: true,
              name: true,
              description: true,
              iconUrl: true,
              aliases: true
            }
          }
        },
        orderBy: { order: 'asc' }
      });

      return NextResponse.json({ 
        success: true, 
        favoriteGames: updatedFavoriteGames.map(fav => ({
          id: fav.id,
          gameId: fav.gameId,
          addedAt: fav.addedAt,
          order: fav.order,
          game: fav.game
        }))
      });
    }

    return NextResponse.json({ 
      success: true, 
      favoriteGames: favoriteGames.map(fav => ({
        id: fav.id,
        gameId: fav.gameId,
        addedAt: fav.addedAt,
        order: fav.order,
        game: fav.game
      }))
    });
  } catch (error) {
    console.error('좋아하는 게임 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '좋아하는 게임 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 좋아하는 게임 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    const { gameId, order } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: '게임 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 게임이 존재하는지 확인
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json(
        { error: '존재하지 않는 게임입니다.' },
        { status: 404 }
      );
    }

    // 이미 좋아하는 게임인지 확인
    const existingFavorite = await prisma.userFavoriteGame.findUnique({
      where: {
        userId_gameId: {
          userId: user.id,
          gameId: gameId
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: '이미 좋아하는 게임으로 등록되어 있습니다.' },
        { status: 409 }
      );
    }

    // 현재 사용자의 최대 order 값 조회
    const maxOrderResult = await prisma.userFavoriteGame.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    // 새로운 order 값 계산 (기존 최대값 + 1, 또는 전달받은 값)
    const newOrder = order || (maxOrderResult?.order || 0) + 1;

    // 좋아하는 게임 추가
    const favoriteGame = await prisma.userFavoriteGame.create({
      data: {
        userId: user.id,
        gameId: gameId,
        order: newOrder
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            description: true,
            iconUrl: true,
            aliases: true
          }
        }
      }
    });

    // 같은 order 값을 가진 다른 게임들이 있는지 확인하고 정리
    const duplicateOrderItems = await prisma.userFavoriteGame.findMany({
      where: {
        userId: user.id,
        order: newOrder,
        id: { not: favoriteGame.id } // 방금 추가한 항목 제외
      },
      orderBy: { addedAt: 'desc' } // 추가 시간이 늦은 순으로 정렬 (늦게 추가된 게임이 마지막으로 이동)
    });

    // 중복된 order 값들을 순차적으로 증가시킴
    if (duplicateOrderItems.length > 0) {
      const maxOrder = maxOrderResult?.order || 0;
      let currentOrder = maxOrder + 1;
      
      for (const item of duplicateOrderItems) {
        currentOrder++;
        await prisma.userFavoriteGame.update({
          where: { id: item.id },
          data: { order: currentOrder }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      favoriteGame: {
        id: favoriteGame.id,
        gameId: favoriteGame.gameId,
        addedAt: favoriteGame.addedAt,
        order: favoriteGame.order,
        game: favoriteGame.game
      }
    });
  } catch (error) {
    console.error('좋아하는 게임 추가 중 오류 발생:', error);
    return NextResponse.json(
      { error: '좋아하는 게임 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 좋아하는 게임 순서 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    const { favoriteGames } = await request.json();

    if (!Array.isArray(favoriteGames)) {
      return NextResponse.json(
        { error: '잘못된 데이터 형식입니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 순서 업데이트
    await prisma.$transaction(
      favoriteGames.map((fav, index) => 
        prisma.userFavoriteGame.updateMany({
          where: {
            id: fav.id,
            userId: user.id // 보안을 위해 사용자 확인
          },
          data: {
            order: index + 1
          }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('좋아하는 게임 순서 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '순서 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
