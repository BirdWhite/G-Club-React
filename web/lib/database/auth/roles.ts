'use client';

import type { Role as PrismaRole, Permission as PrismaPermission } from '@prisma/client';

// DB 스키마와 일치하는 타입 정의
export type RoleWithPermissions = PrismaRole & {
  permissions: PrismaPermission[];
};

/**
 * 사용자가 특정 권한을 가지고 있는지 확인합니다.
 * @param role 사용자의 역할 객체 (권한 목록 포함)
 * @param permissionName 확인할 권한의 이름 (예: 'post:create')
 * @returns 권한이 있으면 true, 없으면 false
 */
export async function hasPermission(
  role: RoleWithPermissions | null | undefined,
  permissionName: string
): Promise<boolean> {
  if (!role) {
    return false;
  }

  try {
    const response = await fetch('/api/roles/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roleId: role.id,
        permissionName,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.hasPermission;
  } catch (error) {
    console.error('권한 확인 중 오류 발생:', error);
    return false;
  }
}

/**
 * 사용자가 관리자(ADMIN) 또는 그 이상의 역할인지 확인합니다.
 * @param role 사용자의 역할 객체
 * @returns 관리자 이상이면 true, 아니면 false
 */
export function isAdmin(role?: { name: string } | null) {
  return role?.name === 'ADMIN' || role?.name === 'SUPER_ADMIN';
}

/**
 * 사용자가 최상위 관리자(SUPER_ADMIN)인지 확인합니다.
 * @param role 사용자의 역할 객체
 * @returns 최상위 관리자이면 true, 아니면 false
 */
export function isSuperAdmin(role: { name: string } | null | undefined): boolean {
  if (!role) return false;
  return role.name === 'SUPER_ADMIN';
}

