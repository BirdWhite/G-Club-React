import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

// 댓글 수정
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id: postId, commentId } = params;
    const { content } = await request.json();

    // 필수 필드 검증
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 댓글 조회
    const comment = await prisma.gameComment.findUnique({
      where: { id: commentId },
      include: { gamePost: true }
    });

    // 댓글 존재 여부 및 소유 게시글 확인
    if (!comment || comment.gamePostId !== postId) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 확인
    if (comment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '댓글을 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 댓글 수정
    const updatedComment = await prisma.gameComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('댓글 수정 중 오류 발생:', error);
    return NextResponse.json(
      { error: '댓글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id: postId, commentId } = params;

    // 댓글 조회
    const comment = await prisma.gameComment.findUnique({
      where: { id: commentId },
      include: { gamePost: true }
    });

    // 댓글 존재 여부 및 소유 게시글 확인
    if (!comment || comment.gamePostId !== postId) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 또는 관리자 확인
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    if (comment.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: '댓글을 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 댓글 삭제
    await prisma.gameComment.delete({
      where: { id: commentId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('댓글 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
