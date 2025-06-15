/**
 * 인증 및 권한 관리 훅
 */

import { useSession } from 'next-auth/react';
import { UserRole, hasPermission, hasMinimumRole, isAdmin, isSuperAdmin, getUserPermissions, getRoleName, Permission } from '@/lib/auth/roles';

interface UserWithRole {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
}

export const useAuth = () => {
  const { data: session, status } = useSession();

  // 사용자 정보 (세션에서 확장된 정보 포함)
  const user: UserWithRole | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || undefined,
    image: session.user.image || undefined,
    role: (session.user as any).role || UserRole.NONE
  } : null;

  const userRole = user?.role || UserRole.NONE;

  return {
    // 기본 인증 정보
    user,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    userRole,
    roleName: getRoleName(userRole),
    
    // 권한 체크 함수들
    hasPermission: (permission: keyof Permission) => hasPermission(userRole, permission),
    hasMinimumRole: (minimumRole: UserRole) => hasMinimumRole(userRole, minimumRole),
    isAdmin: () => isAdmin(userRole),
    isSuperAdmin: () => isSuperAdmin(userRole),
    
    // 권한 정보
    permissions: getUserPermissions(userRole),
    
    // 편의 기능
    canAccessAdminPanel: hasPermission(userRole, 'canAccessAdminPanel'),
    canManageUsers: hasPermission(userRole, 'canManageUsers'),
    canManageAdmins: hasPermission(userRole, 'canManageAdmins'),
  };
};
