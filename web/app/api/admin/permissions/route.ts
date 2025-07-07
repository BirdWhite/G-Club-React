import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import { UserRole, GlobalPermission, hasGlobalPermission } from '@/lib/auth/roles';
import prisma from '@/lib/prisma';

// GET 요청 처리 - 현재 역할별 글로벌 권한 설정 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 글로벌 권한 설정 조회 (마이그레이션 완료 - 새 테이블 사용)
    const config = await prisma.globalPermissionConfig.findUnique({ where: { id: 1 } });
    
    return NextResponse.json({ 
      permissions: config?.json || null 
    });
  } catch (error) {
    console.error('권한 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 요청 처리 - 역할별 글로벌 권한 설정 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const sessionRole = (session.user as any).role as UserRole;
    let currentPermissions: Record<UserRole, GlobalPermission> | undefined;

    // 현재 권한 설정 조회 (마이그레이션 완료 - 새 테이블 사용)
    const config = await prisma.globalPermissionConfig.findUnique({ where: { id: 1 } });
    if (config?.json) {
      const jsonData = config.json as unknown;
      if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
        currentPermissions = jsonData as Record<UserRole, GlobalPermission>;
      }
    }

    // 권한 체크
    if (!hasGlobalPermission(sessionRole, 'canChangeUserRoles')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    const { permissions } = await request.json();

    // DB에 저장 (upsert) - 마이그레이션 완료 - 새 테이블 사용
    await prisma.globalPermissionConfig.upsert({
      where: { id: 1 },
      update: { json: permissions },
      create: { id: 1, json: permissions },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('권한 업데이트 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
