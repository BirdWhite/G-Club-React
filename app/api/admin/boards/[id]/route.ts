import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import { hasGlobalPermission } from '@/lib/auth/roles';
import prisma from '@/lib/prisma';

// DELETE 요청 처리 - 게시판 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const sessionRole = (session.user as any).role;
    
    // 관리자 권한 체크
    if (!hasGlobalPermission(sessionRole, 'canAccessAdminPanel')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const id = params.id;

    // 게시판 존재 여부 확인
    const board = await prisma.board.findUnique({
      where: { id }
    });

    if (!board) {
      return NextResponse.json({ error: '존재하지 않는 게시판입니다.' }, { status: 404 });
    }

    // 트랜잭션으로 게시판과 관련 게시글, 댓글 모두 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 게시판에 속한 게시글의 모든 댓글 삭제
      await tx.comment.deleteMany({
        where: {
          post: {
            boardId: id
          }
        }
      });

      // 2. 게시판에 속한 모든 게시글 삭제
      await tx.post.deleteMany({
        where: {
          boardId: id
        }
      });

      // 3. 게시판 삭제
      await tx.board.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('게시판 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
