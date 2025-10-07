import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 공지사항 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { commentId } = await params;

    // 댓글 존재 및 권한 확인
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          include: {
            role: true
          }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 작성자이거나 관리자만 삭제 가능
    const isAuthor = comment.authorId === user.id;
    const isAdmin = comment.author.role && ['ADMIN', 'SUPER_ADMIN'].includes(comment.author.role.name);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: '댓글을 삭제할 권한이 없습니다.' }, { status: 403 });
    }

    // 소프트 삭제 (내용은 유지하고 isDeleted만 true로 변경)
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('공지사항 댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
