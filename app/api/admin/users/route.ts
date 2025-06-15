import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';
import { hasPermission, UserRole } from '@/lib/auth/roles';

export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인
    const userRole = (session.user as any).role || UserRole.NONE;
    
    if (!hasPermission(userRole, 'canManageUsers')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 사용자 목록 조회
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profile: {
          select: {
            fullName: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        profile: {
          createdAt: 'desc'
        }
      }
    });

    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 권한 확인
    const userRole = (session.user as any).role || UserRole.NONE;
    
    if (!hasPermission(userRole, 'canManageUsers')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { userId, newRole } = await request.json();

    if (!userId || newRole === undefined) {
      return NextResponse.json(
        { error: '사용자 ID와 새 역할이 필요합니다.' },
        { status: 400 }
      );
    }

    // 슈퍼 관리자만 관리자 권한을 부여할 수 있음
    if (newRole === UserRole.ADMIN && !hasPermission(userRole, 'canManageAdmins')) {
      return NextResponse.json(
        { error: '관리자 권한 부여는 슈퍼 관리자만 가능합니다.' },
        { status: 403 }
      );
    }

    // 자기 자신의 권한은 변경할 수 없음 (단, 슈퍼 관리자는 본인 변경 허용)
    const isSelf = userId === session.user.id;
    const isSuperAdmin = (session.user as any).role === UserRole.SUPER_ADMIN;
    if (isSelf && !isSuperAdmin) {
      return NextResponse.json(
        { error: '자신의 권한은 변경할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 사용자 역할 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json({ 
      message: '사용자 권한이 업데이트되었습니다.',
      user: updatedUser 
    });
    
  } catch (error) {
    console.error('사용자 권한 업데이트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
