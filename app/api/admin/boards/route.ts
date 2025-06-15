import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import { hasGlobalPermission } from '@/lib/auth/roles';
import prisma from '@/lib/prisma';

// GET 요청 처리 - 게시판 목록 조회
export async function GET() {
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

    // 게시판 목록 조회
    const boards = await prisma.board.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ boards });
  } catch (error) {
    console.error('게시판 목록 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST 요청 처리 - 새 게시판 생성
export async function POST(request: NextRequest) {
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

    // 요청 데이터 파싱
    const { name, slug, description } = await request.json();

    // 필수 필드 검증
    if (!name || !slug) {
      return NextResponse.json({ error: '게시판 이름과 슬러그는 필수입니다.' }, { status: 400 });
    }

    // 슬러그 형식 검증 (소문자, 숫자, 하이픈만 허용)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: '슬러그는 소문자, 숫자, 하이픈만 사용할 수 있습니다.' }, { status: 400 });
    }

    // 슬러그 중복 검사
    const existingBoard = await prisma.board.findUnique({
      where: { slug }
    });

    if (existingBoard) {
      return NextResponse.json({ error: '이미 사용 중인 슬러그입니다.' }, { status: 400 });
    }

    // 게시판 생성
    const newBoard = await prisma.board.create({
      data: {
        name,
        slug,
        description,
        isActive: true
      }
    });

    return NextResponse.json({ board: newBoard }, { status: 201 });
  } catch (error) {
    console.error('게시판 생성 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
