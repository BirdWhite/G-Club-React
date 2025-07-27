'use client';

import type { Role as PrismaRole, Permission as PrismaPermission, UserProfile } from '@prisma/client';
import { isAdmin as isAdminUtil, isSuperAdmin as isSuperAdminUtil, canManageChannels as canManageChannelsUtil } from './utils';

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

// Re-export for client-side usage to avoid breaking changes
export const isAdmin = isAdminUtil;
export const isSuperAdmin = isSuperAdminUtil;
export const canManageChannels = canManageChannelsUtil;

