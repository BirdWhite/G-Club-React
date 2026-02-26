import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { GamePostStatus } from '@/types/models';

// 모집 종료 (OPEN -> COMPLETED, 게임 시작 없이 모집만 마감)
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    const post = await prisma.gamePost.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    if (post.status !== GamePostStatus.OPEN) {
      return NextResponse.json(
        { error: '모집 중인 글만 모집 종료할 수 있습니다.' },
        { status: 400 }
      );
    }

    await prisma.gamePost.update({
      where: { id },
      data: {
        status: GamePostStatus.EXPIRED,
      },
    });

    return NextResponse.json({
      success: true,
      status: GamePostStatus.EXPIRED,
      message: '모집이 종료되었습니다.',
    });
  } catch (error) {
    console.error('모집 종료 오류:', error);
    return NextResponse.json(
      { error: '모집 종료에 실패했습니다.' },
      { status: 500 }
    );
  }
}
