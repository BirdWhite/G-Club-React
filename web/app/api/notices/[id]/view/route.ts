import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// 공지사항 조회수 증가 API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  try {
    const { id } = await params;
    
    // 현재 사용자 정보 가져오기
    // const supabase = await createServerClient();
    // const { data: { user } } = await supabase.auth.getUser(); // 현재 미사용
    // const userId = user?.id; // 현재 미사용
    
    // 클라이언트 IP 가져오기 (중복 방지용) - 현재 미사용
    // const clientIP = request.headers.get('x-forwarded-for') || 
    //                  request.headers.get('x-real-ip') || 
    //                  'unknown';
    
    // 중복 조회 방지를 위한 키 생성 (현재 미사용)
    // const viewKey = `${id}_${userId || clientIP}`;
    
    // 공지사항 존재 여부 확인
    const notice = await prisma.notice.findUnique({
      where: { 
        id,
        isDeleted: false
      },
      select: { id: true }
    });
    
    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 조회수 증가 (중복 방지 로직은 추후 개선 가능)
    await prisma.notice.update({
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
    console.error('공지사항 조회수 증가 오류:', error);
    return NextResponse.json(
      { error: '조회수 증가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
