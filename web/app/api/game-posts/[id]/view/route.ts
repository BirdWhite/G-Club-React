import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// 조회수 증가 API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  try {
    const { id } = await params;
    
    // 게시글 존재 여부 확인
    const post = await prisma.gamePost.findUnique({
      where: { 
        id,
        status: { not: 'DELETED' }
      },
      select: { id: true }
    });
    
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 조회수 증가 (중복 방지 로직은 추후 개선 가능)
    await prisma.gamePost.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: '조회수가 증가되었습니다.' 
    });
    
  } catch (error) {
    console.error('조회수 증가 오류:', error);
    return NextResponse.json(
      { error: '조회수 증가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
