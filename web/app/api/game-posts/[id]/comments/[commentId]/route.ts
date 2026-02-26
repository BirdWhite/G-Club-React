import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { sanitizeUserInput, INPUT_LIMITS } from '@/lib/utils/common';

// 댓글 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id: gamePostId, commentId } = await params;
    const { content } = await request.json();

    // 입력 검증 및 필터링
    const sanitizedContent = sanitizeUserInput(content);
    if (!sanitizedContent) {
      return NextResponse.json(
        { error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    if (sanitizedContent.length > INPUT_LIMITS.GAME_POST_COMMENT_MAX) {
      return NextResponse.json(
        { error: `댓글은 ${INPUT_LIMITS.GAME_POST_COMMENT_MAX}자 이하로 작성해주세요.` },
        { status: 400 }
      );
    }

    // 사용자 프로필 확인
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 댓글 존재 및 권한 확인
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        gamePostId,
        authorId: profile.userId,
        isDeleted: false
      }
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없거나 수정 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 수정
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: sanitizedContent,
        updatedAt: new Date()
      },
      include: {
        author: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return NextResponse.json(
      { error: '댓글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 삭제 (소프트 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id: gamePostId, commentId } = await params;

    // 사용자 프로필 확인
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 댓글 존재 및 권한 확인
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        gamePostId,
        authorId: profile.userId,
        isDeleted: false
      }
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없거나 삭제 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 소프트 삭제 (원본 내용 유지)
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}