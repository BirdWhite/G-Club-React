import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { getDisplayImageUrl, sanitizeUserInput, INPUT_LIMITS } from '@/lib/utils/common';

// 프로필 업데이트 공통 함수
async function handleProfileUpdate(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
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

    // Supabase OAuth에서 이메일 정보 가져오기
    const email = user.email || null;

    if (!name || !birthDate) {
      return NextResponse.json(
        { error: '이름과 생년월일은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    // 이름 필터링 (HTML/스크립트 제거) 및 검증
    const sanitizedName = sanitizeUserInput(name);
    if (!sanitizedName) {
      return NextResponse.json(
        { error: '이름을 입력해주세요.' },
        { status: 400 }
      );
    }
    if (sanitizedName.length < INPUT_LIMITS.PROFILE_NAME_MIN) {
      return NextResponse.json(
        { error: `이름은 ${INPUT_LIMITS.PROFILE_NAME_MIN}글자 이상 입력해주세요.` },
        { status: 400 }
      );
    }
    if (sanitizedName.length > INPUT_LIMITS.PROFILE_NAME_MAX) {
      return NextResponse.json(
        { error: `이름은 ${INPUT_LIMITS.PROFILE_NAME_MAX}글자 이하로 입력해주세요.` },
        { status: 400 }
      );
    }

    // 생년월일 형식 및 범위 검증 (YYYY-MM-DD)
    const birthDateStr = String(birthDate).trim();
    const birthRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthRegex.test(birthDateStr)) {
      return NextResponse.json(
        { error: '올바른 생년월일 형식(YYYY-MM-DD)을 입력해주세요.' },
        { status: 400 }
      );
    }
    const birth = new Date(birthDateStr);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    if (isNaN(birth.getTime()) || age < 1 || age > 150) {
      return NextResponse.json(
        { error: '올바른 생년월일을 입력해주세요.' },
        { status: 400 }
      );
    }

    let imageUrl = image || '';
    
    // 이미지 URL이 제공된 경우에만 사용 (이미 클라이언트에서 Supabase에 업로드됨)
    if (imageUrl) {
      // 이미지 URL에 타임스탬프 추가하여 캐시 무효화
      imageUrl = `${imageUrl}?t=${Date.now()}`;
    }

    // 'NONE' 역할 조회
    const noneRole = await prisma.role.findUnique({
      where: { name: 'NONE' },
      select: { id: true },
    });

    if (!noneRole) {
      console.error("Default 'NONE' role not found in the database. Seeding might be required.");
      return NextResponse.json(
        { error: "기본 역할 설정을 찾을 수 없습니다. 관리자에게 문의하세요." },
        { status: 500 }
      );
    }
    
    // 트랜잭션으로 프로필 업데이트
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        name: sanitizedName,
        email, // OAuth 이메일 정보 (항상 포함)
        birthDate: new Date(birthDate),
        ...(imageUrl && { image: imageUrl })
      },
      create: {
        userId,
        name: sanitizedName,
        email, // OAuth 이메일 정보 (항상 포함)
        birthDate: new Date(birthDate),
        ...(imageUrl && { image: imageUrl }),
        roleId: noneRole.id, // 신규 생성 시 'NONE' 역할 할당
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
    const supabase = await createServerClient();
    
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
      where: { userId },
      include: {
        role: true, // 역할 정보를 함께 불러옵니다.
      }
    });
    
    
    // OAuth 이메일 정보 가져오기
    const oauthEmail = user.email || null;
    
    // 기존 프로필에 이메일이 없는 경우 업데이트
    if (userProfile && oauthEmail && !userProfile.email) {
      try {
        userProfile = await prisma.userProfile.update({
          where: { userId },
          data: { email: oauthEmail },
          include: { role: true }
        });
      } catch (error) {
        console.error('이메일 필드 업데이트 실패:', error);
      }
    }
    
    // 프로필이 없는 경우 기본 프로필 생성 (동시성 문제 해결을 위해 upsert 사용)
    if (!userProfile) {
      // 기본 역할 조회 (NONE 권한)
      const defaultRole = await prisma.role.findFirst({
        where: { name: 'NONE' }
      });
      
      if (!defaultRole) {
        console.error("Default 'NONE' role not found in the database. Seeding might be required.");
        return NextResponse.json(
          { error: "기본 역할 설정을 찾을 수 없습니다. 관리자에게 문의하세요." },
          { status: 500 }
        );
      }
      
      // upsert를 사용하여 동시성 문제 해결
      userProfile = await prisma.userProfile.upsert({
        where: { userId },
        update: {
          // 이미 존재하는 경우 업데이트할 데이터 (기본적으로는 변경하지 않음)
          email: oauthEmail, // OAuth 이메일 정보만 업데이트
        },
        create: {
          userId,
          name: user.user_metadata?.full_name || `사용자_${userId.substring(0, 6)}`,
          email: oauthEmail, // OAuth 이메일 정보 (항상 포함)
          birthDate: new Date('2000-01-01'), // 기본 생년월일
          image: '',
          roleId: defaultRole.id
        },
        include: {
          role: true, // 생성된 프로필에도 역할 정보를 포함합니다.
        }
      });
    }
    
    // 프로필 이미지 URL에 타임스탬프 추가하여 캐시 무효화 (카카오 이미지는 제외)
    const displayImage = getDisplayImageUrl(userProfile?.image);
    const profileData = {
      ...userProfile,
      image: displayImage
        ? `${displayImage}?t=${Date.now()}`
        : null,
      email: userProfile?.email || null
    };

    return NextResponse.json({
      profile: profileData,
      user: {
        id: userProfile?.userId,
        name: userProfile?.name,
        image: displayImage
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