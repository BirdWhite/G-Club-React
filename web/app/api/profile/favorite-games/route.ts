import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// 좋아하는 게임 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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
      orderBy: [
        { order: 'asc' },  // 사용자 정의 순서 우선
        { addedAt: 'desc' } // 추가 날짜 순
      ]
    });

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
    const supabase = await createClient();
    
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

    // 좋아하는 게임 추가
    const favoriteGame = await prisma.userFavoriteGame.create({
      data: {
        userId: user.id,
        gameId: gameId,
        order: order || null
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
    const supabase = await createClient();
    
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
