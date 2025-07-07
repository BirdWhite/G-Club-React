import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import { UserRole, hasGlobalPermission } from '@/lib/auth/roles';
import prisma from '@/lib/prisma';

// GET 요청 처리 - 현재 게시판별 권한 설정 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 게시판별 권한 설정 조회
    const config = await prisma.boardPermissionConfig.findUnique({ where: { id: 1 } });
    
    return NextResponse.json({ 
      boardPermissions: config?.json || {} 
    });
  } catch (error) {
    console.error('게시판 권한 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 요청 처리 - 게시판별 권한 설정 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const sessionRole = (session.user as any).role as UserRole;

    // 권한 체크 - 관리자 이상만 게시판 권한 설정 가능
    if (!hasGlobalPermission(sessionRole, 'canAccessAdminPanel')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    const { boardPermissions } = await request.json();

    // DB에 저장 (upsert)
    await prisma.boardPermissionConfig.upsert({
      where: { id: 1 },
      update: { json: boardPermissions },
      create: { id: 1, json: boardPermissions },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('게시판 권한 업데이트 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
