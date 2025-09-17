import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// 좋아하는 게임 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const favoriteGameId = params.id;

    // 좋아하는 게임이 존재하고 해당 사용자의 것인지 확인
    const favoriteGame = await prisma.userFavoriteGame.findFirst({
      where: {
        id: favoriteGameId,
        userId: user.id
      }
    });

    if (!favoriteGame) {
      return NextResponse.json(
        { error: '좋아하는 게임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 좋아하는 게임 삭제
    await prisma.userFavoriteGame.delete({
      where: { id: favoriteGameId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('좋아하는 게임 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '좋아하는 게임 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
