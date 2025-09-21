import prisma from '../prisma';
import type { Permission } from '@prisma/client';

/**
 * [Server-side] 사용자가 특정 권한을 가지고 있는지 확인합니다.
 * 데이터베이스를 직접 조회합니다.
 * @param roleId 사용자의 역할 ID (string)
 * @param permissionName 확인할 권한의 이름 (예: 'post:create')
 * @returns 권한이 있으면 true, 없으면 false
 */
export async function hasPermission_Server(
  roleId: string,
  permissionName: string
): Promise<boolean> {
  if (!roleId) {
    return false;
  }

  try {
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    if (!roleWithPermissions) {
      return false;
    }
    
    // 슈퍼 어드민은 모든 권한을 가집니다.
    if (roleWithPermissions.name === 'SUPER_ADMIN') {
      return true;
    }

    return roleWithPermissions.permissions.some(
      (p: Permission) => p.name === permissionName
    );
  } catch (error) {
    console.error('권한 확인 중 서버 오류 발생:', error);
    return false;
  }
}

/**
 * [Server-side] 사용자가 관리자(ADMIN) 또는 그 이상의 역할인지 확인합니다.
 * @param role 사용자의 역할 객체
 * @returns 관리자 이상이면 true, 아니면 false
 */
export function isAdmin_Server(role?: { name: string } | null): boolean {
  if (!role) return false;
  return role.name === 'ADMIN' || role.name === 'SUPER_ADMIN';
}

/**
 * [Server-side] 사용자가 최상위 관리자(SUPER_ADMIN)인지 확인합니다.
 * @param role 사용자의 역할 객체
 * @returns 최상위 관리자이면 true, 아니면 false
 */
export function isSuperAdmin_Server(role?: { name: string } | null): boolean {
  if (!role) return false;
  return role.name === 'SUPER_ADMIN';
}

/**
 * [Server-side] 사용자가 채널을 관리할 권한이 있는지 확인합니다.
 * @param roleName 사용자의 역할 이름 (string)
 * @returns 채널 관리 권한이 있으면 true, 아니면 false
 */
export function canManageChannels_Server(roleName: string | null | undefined): boolean {
  if (!roleName) {
    return false;
  }
  // 슈퍼 어드민 또는 어드민은 채널 관리 권한을 가집니다.
  return roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
}
