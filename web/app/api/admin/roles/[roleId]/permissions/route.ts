import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { isSuperAdmin_Server } from '@/lib/database/auth';

type Params = {
  roleId: string;
};

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { 
        role: {
          include: {
            permissions: true
          }
        } 
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 슈퍼 관리자 권한 확인
    if (!isSuperAdminServer(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다. 슈퍼 관리자만 권한을 변경할 수 있습니다.' }, { status: 403 });
    }

    const { roleId } = params;
    const { permissionId, action } = await request.json();

    // 대상 역할이 존재하는지 확인
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true }
    });

    if (!targetRole) {
      return NextResponse.json({ error: '존재하지 않는 역할입니다.' }, { status: 404 });
    }

    // SUPER_ADMIN 역할의 권한은 변경할 수 없음
    if (targetRole.name === 'SUPER_ADMIN') {
      return NextResponse.json({ error: '슈퍼 관리자의 권한은 변경할 수 없습니다.' }, { status: 403 });
    }

    // 권한 추가 또는 제거
    if (action === 'add') {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            connect: { id: permissionId }
          }
        }
      });
    } else if (action === 'remove') {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            disconnect: { id: permissionId }
          }
        }
      });
    } else {
      return NextResponse.json({ error: '잘못된 작업입니다.' }, { status: 400 });
    }

    // 업데이트된 역할 정보 반환
    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true }
    });

    return NextResponse.json({
      success: true,
      role: updatedRole
    });

  } catch (error) {
    console.error('권한 변경 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 