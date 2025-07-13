import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// 프로필 업데이트 공통 함수
async function handleProfileUpdate(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID를 찾을 수 없습니다.' }, 
        { status: 400 }
      );
    }
    
    // JSON 형식의 요청 본문 파싱
    const requestBody = await req.json();
    const { name, birthDate, image } = requestBody;
    
    if (!name || !birthDate) {
      return NextResponse.json(
        { error: '이름과 생년월일은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    let imageUrl = image || '';
    
    // 이미지 URL이 제공된 경우에만 사용 (이미 클라이언트에서 Supabase에 업로드됨)
    if (imageUrl) {
      // 이미지 URL에 타임스탬프 추가하여 캐시 무효화
      imageUrl = `${imageUrl}?t=${Date.now()}`;
    }
    
    // 프로필 업데이트 또는 생성
    const profileData = {
      name,
      birthDate: new Date(birthDate),
      ...(imageUrl && { image: imageUrl })
    };
    
    // 트랜잭션으로 프로필 업데이트
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('프로필 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로필 정보 가져오기
export async function GET() {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID를 찾을 수 없습니다.' }, 
        { status: 400 }
      );
    }
    
    // 사용자 프로필 조회
    let userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });
    
    // 프로필이 없는 경우 기본 프로필 생성
    if (!userProfile) {
      // 기본 역할 조회 (NONE 권한)
      const defaultRole = await prisma.role.findFirst({
        where: { name: 'NONE' }
      });
      
      // 기본 프로필 생성
      userProfile = await prisma.userProfile.create({
        data: {
          userId,
          name: user.user_metadata?.full_name || `사용자_${userId.substring(0, 6)}`,
          birthDate: new Date('2000-01-01'), // 기본 생년월일
          image: user.user_metadata?.avatar_url || '',
          roleId: defaultRole?.id
        }
      });
    }
    
    // 프로필 이미지 URL에 타임스탬프 추가하여 캐시 무효화
    const profileData = {
      ...userProfile,
      image: userProfile.image 
        ? `${userProfile.image}?t=${Date.now()}` 
        : null
    };
    
    return NextResponse.json({ 
      profile: profileData,
      user: {
        id: userProfile.userId,
        name: userProfile.name,
        image: userProfile.image
      }
    });
  } catch (error) {
    console.error('프로필 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '프로필 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로필 생성 또는 수정 (POST)
export async function POST(req: NextRequest) {
  return handleProfileUpdate(req);
}