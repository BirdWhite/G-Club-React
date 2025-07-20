import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { roleId, permissionName } = await request.json();

    if (!roleId || !permissionName) {
      return NextResponse.json({ hasPermission: false });
    }

    // 역할 정보 조회
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      return NextResponse.json({ hasPermission: false });
    }

    // 슈퍼 관리자는 모든 권한을 가짐
    if (role.name === 'SUPER_ADMIN') {
      return NextResponse.json({ hasPermission: true });
    }

    // 권한 확인
    const hasPermission = role.permissions.some(
      permission => permission.name === permissionName
    );

    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('권한 확인 중 오류 발생:', error);
    return NextResponse.json({ hasPermission: false });
  }
} 