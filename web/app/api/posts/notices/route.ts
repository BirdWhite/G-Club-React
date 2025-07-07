import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET 요청 처리 - 공지사항 최신글 조회
export async function GET(request: NextRequest) {
  try {
    // URL 쿼리 파라미터에서 limit 값 추출 (기본값 5)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    
    // 공지사항 게시판 찾기
    const noticeBoard = await prisma.board.findUnique({
      where: { slug: 'notice' }
    });
    
    // 공지사항 게시판이 없는 경우
    if (!noticeBoard) {
      return NextResponse.json({ 
        notices: [],
        message: '공지사항 게시판이 존재하지 않습니다.' 
      });
    }
    
    // 공지사항 최신글 조회
    const notices = await prisma.post.findMany({
      where: { 
        boardId: noticeBoard.id,
        published: true
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return NextResponse.json({ notices });
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
