import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    // 대소문자 구분 없이 이름이나 이메일로 검색
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
      },
      take: 10, // 최대 10명까지 반환
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    return NextResponse.json(
      { error: '사용자 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
