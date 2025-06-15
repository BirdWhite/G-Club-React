import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Next.js 15에서 동적 라우트 파라미터 처리
// params는 Promise로 타입 지정해야 함
type Params = Promise<{ slug: string }>

// GET 요청 처리 - 특정 게시판의 게시물 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Next.js 15에서는 params를 비동기적으로 처리해야 함
    const { slug } = await params;

    // URL 쿼리 파라미터에서 페이지네이션 값 추출
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const skip = (page - 1) * limit;
    
    // 게시판 존재 여부 확인
    const board = await prisma.board.findUnique({
      where: { slug }
    });
    
    // 게시판이 없는 경우
    if (!board) {
      return NextResponse.json(
        { error: '존재하지 않는 게시판입니다.' },
        { status: 404 }
      );
    }
    
    // 게시물 조회
    const posts = await prisma.post.findMany({
      where: { 
        boardId: board.id,
        published: true
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    
    // 전체 게시물 수 조회 (페이지네이션용)
    const totalPosts = await prisma.post.count({
      where: { 
        boardId: board.id,
        published: true
      }
    });
    
    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      },
      board: {
        id: board.id,
        name: board.name,
        slug: board.slug,
        description: board.description
      }
    });
  } catch (error) {
    console.error('게시판 게시물 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
