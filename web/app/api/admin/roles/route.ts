import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { getUserProfile } from '@/lib/user';
import { isAdmin_Server } from '@/lib/database/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminProfile = await getUserProfile(user.id);

    if (!adminProfile) {
      return NextResponse.json({ error: '관리자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 관리자 권한 확인
    if (!isAdmin_Server(adminProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: true
      }
    });

    return NextResponse.json({ roles });

  } catch (error) {
    console.error('역할 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 