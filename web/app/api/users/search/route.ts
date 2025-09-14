import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('인증되지 않은 사용자');
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    console.log('검색 쿼리:', query);

    if (!query || query.length < 2) {
      console.log('쿼리가 너무 짧음');
      return NextResponse.json([]);
    }

    // 사용자 이름으로 검색 (대소문자 구분 없음)
    const users = await prisma.userProfile.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        userId: true,
        name: true,
        email: true,
        image: true,
      },
      take: 10, // 최대 10명까지만 반환
      orderBy: {
        name: 'asc',
      },
    });

    console.log('검색된 사용자 수:', users.length);
    console.log('검색 결과:', users);

    // 검색 결과가 없으면 게스트 참여자 옵션 추가
    if (users.length === 0) {
      const guestOption = {
        userId: null,
        name: query,
        image: null,
        isGuest: true
      };
      return NextResponse.json([guestOption]);
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    return NextResponse.json(
      { error: '사용자 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}