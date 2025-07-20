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

  // 관리자만 게시물을 일괄 삭제할 수 있도록 권한 확인
  if (!userProfile || !isAdmin_Server(userProfile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // 해당 게시판의 모든 게시물 삭제
    const { count } = await prisma.post.deleteMany({
      where: { boardId },
    });

    return NextResponse.json({ message: `${count} posts deleted successfully.` });
  } catch (error: any) {
    console.error(`Error deleting posts for board ${boardId}:`, error);
    return NextResponse.json({ error: 'Failed to delete posts' }, { status: 500 });
  }
} 