import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { 
          error: '인증되지 않은 사용자입니다.',
          details: 'Auth session missing!'
        },
        { status: 401 }
      );
    }

    const { userId } = await params;

    // 해당 사용자의 프로필 조회
    const profile = await prisma.userProfile.findUnique({
      where: {
        userId: userId
      },
      include: {
        role: true
      }
    });

    if (!profile) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 민감한 정보는 제외하고 반환
    const safeProfile = {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      birthDate: profile.birthDate,
      image: profile.image,
      role: profile.role,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    return NextResponse.json({ profile: safeProfile });

  } catch (error) {
    console.error('프로필 조회 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
