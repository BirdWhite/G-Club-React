import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';
import { UserRole, hasBoardPermission } from '@/lib/auth/roles';

// POST 요청 처리 - 새 게시글 작성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { title, content, boardSlug, published = true } = await request.json();
    
    // 필수 필드 검증
    if (!title || !content || !boardSlug) {
      return NextResponse.json({ error: '제목, 내용, 게시판은 필수 항목입니다.' }, { status: 400 });
    }
    
    // 게시판 존재 여부 확인
    const board = await prisma.board.findUnique({
      where: { slug: boardSlug }
    });
    
    if (!board) {
      return NextResponse.json({ error: '존재하지 않는 게시판입니다.' }, { status: 404 });
    }
    
    // 게시판 권한 설정 조회
    const permissionsConfig = await prisma.boardPermissionConfig.findUnique({
      where: { id: 1 }
    });
    
    const boardPermissions = permissionsConfig?.json as any || {};
    const userRole = (session.user as any).role as UserRole;
    
    // 글쓰기 권한 체크
    if (!hasBoardPermission(userRole, boardSlug, 'canWrite', boardPermissions)) {
      return NextResponse.json({ error: '이 게시판에 글을 작성할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 게시글 생성
    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        board: {
          connect: { id: board.id }
        },
        author: {
          connect: { id: session.user.id }
        }
      }
    });
    
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
