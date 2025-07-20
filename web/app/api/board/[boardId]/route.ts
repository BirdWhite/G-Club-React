import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { isAdmin_Server } from '@/lib/auth/serverAuth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: { role: true },
  });

  if (!userProfile || !isAdmin_Server(userProfile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // 트랜잭션을 사용하여 하위 게시물을 먼저 삭제하고, 그 다음 게시판을 삭제합니다.
    const result = await prisma.$transaction(async (tx) => {
      // 1. 게시판에 속한 모든 게시물 삭제
      const deletedPosts = await tx.post.deleteMany({
        where: { boardId },
      });

      // 2. 게시판 삭제
      const deletedBoard = await tx.board.delete({
        where: { id: boardId },
      });

      return { deletedBoard, deletedPostsCount: deletedPosts.count };
    });

    return NextResponse.json({ 
      message: 'Board and all its posts deleted successfully.',
      data: {
        deletedBoardId: result.deletedBoard.id,
        deletedPostsCount: result.deletedPostsCount
      } 
    });

  } catch (error: any) {
    console.error(`Error deleting board ${boardId}:`, error);
    if (error.code === 'P2025') { // Prisma 에러 코드: 레코드를 찾을 수 없음
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
} 