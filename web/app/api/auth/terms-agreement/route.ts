import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase/server';
import prisma from '@/lib/database/prisma';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 현재 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { termsAgreed, privacyAgreed } = body;

    // 필수 약관 동의 확인 (단일 약관으로 통합)
    if (!termsAgreed || !privacyAgreed) {
      return NextResponse.json(
        { error: '필수 약관에 동의해주세요.' },
        { status: 400 }
      );
    }

    // 현재 시간
    const now = new Date();

    // UserProfile 업데이트
    const updatedProfile = await prisma.userProfile.update({
      where: {
        userId: user.id
      },
      data: {
        termsAgreed: termsAgreed,
        termsAgreedAt: termsAgreed ? now : null,
        privacyAgreed: privacyAgreed,
        privacyAgreedAt: privacyAgreed ? now : null,
        updatedAt: now
      }
    });

    return NextResponse.json({
      success: true,
      message: '약관 동의가 완료되었습니다.',
      data: {
        termsAgreed: updatedProfile.termsAgreed,
        termsAgreedAt: updatedProfile.termsAgreedAt,
        privacyAgreed: updatedProfile.privacyAgreed,
        privacyAgreedAt: updatedProfile.privacyAgreedAt
      }
    });

  } catch (error) {
    console.error('Terms agreement error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 약관 동의 상태 조회
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // 현재 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // UserProfile 조회
    const profile = await prisma.userProfile.findUnique({
      where: {
        userId: user.id
      },
      select: {
        termsAgreed: true,
        termsAgreedAt: true,
        privacyAgreed: true,
        privacyAgreedAt: true
      }
    });

    if (!profile) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Terms agreement status error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
