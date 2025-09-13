import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// 기존 게임 아이콘 URL에서 포트 번호를 제거하는 API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 관리자 권한 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true }
    });

    if (!userProfile?.role || !['ADMIN', 'SUPER_ADMIN'].includes(userProfile.role.name)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' }, 
        { status: 403 }
      );
    }

    // 포트 번호가 포함된 게임 아이콘 URL들을 찾아서 수정
    const games = await prisma.game.findMany({
      where: {
        iconUrl: {
          contains: ':54321'
        }
      }
    });

    console.log(`포트 번호가 포함된 게임 아이콘 ${games.length}개를 찾았습니다.`);

    const updateResults = [];

    for (const game of games) {
      if (game.iconUrl) {
        const cleanUrl = game.iconUrl.replace(':54321', '');
        
        await prisma.game.update({
          where: { id: game.id },
          data: { iconUrl: cleanUrl }
        });

        updateResults.push({
          gameId: game.id,
          gameName: game.name,
          oldUrl: game.iconUrl,
          newUrl: cleanUrl
        });

        console.log(`게임 "${game.name}" 아이콘 URL 수정: ${game.iconUrl} -> ${cleanUrl}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updateResults.length}개의 게임 아이콘 URL이 수정되었습니다.`,
      results: updateResults
    });

  } catch (error) {
    console.error('게임 아이콘 URL 수정 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
