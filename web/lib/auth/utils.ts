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
