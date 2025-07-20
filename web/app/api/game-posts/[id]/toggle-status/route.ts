import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;
    
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

    // 상태 토글 (OPEN <-> COMPLETED)
    const newStatus = post.status === 'OPEN' ? 'COMPLETED' : 'OPEN';
    
    const updatedPost = await prisma.gamePost.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedPost.status,
      message: `모집이 ${newStatus === 'OPEN' ? '재개' : '마감'}되었습니다.`
    });
    
  } catch (error) {
    console.error('모집 상태 변경 오류:', error);
    return NextResponse.json(
      { error: '모집 상태 변경에 실패했습니다.' },
      { status: 500 }
    );
  }
}
