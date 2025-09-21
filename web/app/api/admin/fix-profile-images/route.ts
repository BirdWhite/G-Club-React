import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 기존 프로필 이미지 URL에서 포트 번호를 제거하는 API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 관리자 권한 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true }
    });

    if (!userProfile?.role || !['ADMIN', 'SUPER_ADMIN'].includes(userProfile.role.name)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' }, 
        { status: 403 }
      );
    }

    // 포트 번호가 포함된 프로필 이미지 URL들을 찾아서 수정
    const profiles = await prisma.userProfile.findMany({
      where: {
        image: {
          contains: ':54321'
        }
      }
    });

    console.log(`포트 번호가 포함된 프로필 이미지 ${profiles.length}개를 찾았습니다.`);

    const updateResults = [];

    for (const profile of profiles) {
      if (profile.image) {
        const cleanUrl = profile.image.replace(':54321', '');
        
        await prisma.userProfile.update({
          where: { id: profile.id },
          data: { image: cleanUrl }
        });

        updateResults.push({
          profileId: profile.id,
          userId: profile.userId,
          oldUrl: profile.image,
          newUrl: cleanUrl
        });

        console.log(`사용자 "${profile.name}" 프로필 이미지 URL 수정: ${profile.image} -> ${cleanUrl}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updateResults.length}개의 프로필 이미지 URL이 수정되었습니다.`,
      results: updateResults
    });

  } catch (error) {
    console.error('프로필 이미지 URL 수정 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
