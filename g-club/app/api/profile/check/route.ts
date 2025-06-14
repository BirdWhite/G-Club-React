import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('프로필 확인 세션:', JSON.stringify(session, null, 2));
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 세션에 id가 없는 경우 email을 id로 사용
    const userId = session.user.id || session.user.email;
    
    // userId가 없으면 오류 반환
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID를 찾을 수 없습니다.' }, { status: 400 });
    }

    // 사용자 프로필 확인
    const profile = await prisma.profile.findUnique({
      where: {
        userId: userId,
      },
    });
    
    console.log('프로필 확인 결과:', { userId, hasProfile: !!profile });

    return NextResponse.json({ hasProfile: !!profile });
  } catch (error) {
    console.error('프로필 확인 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
