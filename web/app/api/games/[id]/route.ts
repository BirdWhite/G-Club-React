import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

// 올바른 타입 정의
type RouteContext = {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    const game = await prisma.game.findUnique({
      where: { id },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { name, description, iconUrl, aliases } = await request.json();

    if (!name) {
      return NextResponse.json({ error: '게임 이름은 필수입니다.' }, { status: 400 });
    }

    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        name,
        description,
        iconUrl,
        aliases: {
          set: aliases?.map((alias: string) => alias.toLowerCase()) || [],
        },
      },
    });

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('게임 수정 오류:', error);
    return NextResponse.json({ error: '게임을 수정하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const gameToDelete = await prisma.game.findUnique({
      where: { id },
    });

    if (!gameToDelete) {
      return NextResponse.json({ error: '삭제할 게임을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (gameToDelete.iconUrl) {
      const supabase = await createClient();
      const fileName = gameToDelete.iconUrl.split('/').pop();

      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from('game-icons')
          .remove([fileName]);

        if (deleteError) {
          console.error('Supabase 스토리지 파일 삭제 오류:', deleteError);
        }
      }
    }

    await prisma.game.delete({
      where: { id },
    });

    return NextResponse.json({ message: '게임이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('게임 삭제 오류:', error);
    return NextResponse.json({ error: '게임을 삭제하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
