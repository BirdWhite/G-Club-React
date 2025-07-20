import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { getUserProfile } from '@/lib/user';
import { hasPermissionServer, isSuperAdminServer } from '@/lib/auth/serverAuth'; // 1. 서버 전용 함수 임포트

type Params = {
    userId: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const targetUserProfileId = params.userId; // URL 파라미터는 UserProfile의 ID (CUID) 입니다.

    const supabase = await createClient();
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !adminUser) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const adminProfile = await getUserProfile(adminUser.id);

    if (!adminProfile) {
      return NextResponse.json({ error: '관리자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 역할 변경 권한 확인 (서버 전용 함수 사용)
    if (!hasPermissionServer(adminProfile.role, 'admin:role:manage')) {
      return NextResponse.json({ error: '사용자 역할을 변경할 권한이 없습니다.' }, { status: 403 });
    }

    const { roleId: newRoleId } = await request.json();

    if (!newRoleId) {
      return NextResponse.json({ error: '새로운 역할 ID가 필요합니다.' }, { status: 400 });
    }
    
    const targetRole = await prisma.role.findUnique({ where: { id: newRoleId } });
    if (!targetRole) {
      return NextResponse.json({ error: '존재하지 않는 역할입니다.' }, { status: 400 });
    }

    // 2. UserProfile의 ID (CUID)로 대상 사용자를 직접 조회합니다.
    const targetUser = await prisma.userProfile.findUnique({
        where: { id: targetUserProfileId },
        include: { role: true },
    });
    if (!targetUser) {
        return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 슈퍼 관리자가 아닌 경우, 다른 슈퍼 관리자 또는 자신의 역할을 변경할 수 없음
    if (!isSuperAdminServer(adminProfile.role)) {
        if (targetUser.role?.name === 'SUPER_ADMIN') {
            return NextResponse.json({ error: '슈퍼 관리자의 역할은 변경할 수 없습니다.' }, { status: 403 });
        }
    }
    
    // 슈퍼 관리자가 자기 자신을 변경하는 경우는 허용, 그 외에는 자신의 역할 변경 불가
    if (targetUser.userId === adminUser.id && !isSuperAdminServer(adminProfile.role)) {
        return NextResponse.json({ error: '자신의 역할은 변경할 수 없습니다.' }, { status: 403 });
    }


    // 사용자 역할 업데이트
    const updatedUserProfile = await prisma.userProfile.update({
      where: { id: targetUser.id },
      data: { roleId: newRoleId },
    });

    return NextResponse.json({
      success: true,
      message: '사용자 역할이 성공적으로 업데이트되었습니다.',
      user: updatedUserProfile,
    });

  } catch (error) {
    console.error('사용자 역할 업데이트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 