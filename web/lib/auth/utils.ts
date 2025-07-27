import type { Role as PrismaRole } from '@prisma/client';

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

export function canManageChannels(role?: { name: string, permissions?: { name: string }[] } | null): boolean {
  if (!role) {
    return false;
  }
  // 슈퍼 어드민은 모든 권한을 가집니다.
  if (role.name === 'SUPER_ADMIN') {
    return true;
  }
  if (!role.permissions) {
    return false;
  }
  return role.permissions.some(p => p.name === 'MANAGE_CHANNELS');
} 