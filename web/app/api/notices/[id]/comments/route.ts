import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 공지사항 댓글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noticeId } = await params;

    // 공지사항 존재 확인
    const notice = await prisma.notice.findUnique({
      where: { id: noticeId, isDeleted: false }
    });

    if (!notice) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 댓글 목록 조회 (삭제된 댓글도 포함)
    const comments = await prisma.comment.findMany({
      where: {
        noticeId
      },
      include: {
        author: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 삭제된 댓글의 내용을 "[삭제된 댓글입니다]"로 대체
    const processedComments = comments.map(comment => ({
      ...comment,
      content: comment.isDeleted ? '[삭제된 댓글입니다]' : comment.content
    }));

    return NextResponse.json(processedComments);
  } catch (error) {
    console.error('공지사항 댓글 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 댓글 작성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!user.role || user.role === 'NONE') {
    return NextResponse.json({ error: '회원 승인이 완료된 후 이용 가능합니다.' }, { status: 403 });
  }

  try {
    const { id: noticeId } = await params;
    const { content } = await request.json();

    // 입력 검증
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: '댓글은 1000자 이하로 작성해주세요.' },
        { status: 400 }
      );
    }

    // 공지사항 존재 및 댓글 허용 확인
    const notice = await prisma.notice.findUnique({
      where: { id: noticeId, isDeleted: false }
    });

    if (!notice) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!notice.allowComments) {
      return NextResponse.json({ error: '댓글이 비활성화된 공지사항입니다.' }, { status: 403 });
    }

    // 사용자 프로필 확인
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 댓글 생성
    const comment = await prisma.comment.create({
      data: {
        noticeId,
        authorId: profile.userId,
        content: content.trim()
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('공지사항 댓글 작성 오류:', error);
    return NextResponse.json(
      { error: '댓글 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
