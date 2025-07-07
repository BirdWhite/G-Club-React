/**
 * 사용자 권한 관리 시스템
 * 
 * 권한 계층:
 * - NONE: 권한 없음/미지정
 * - USER: 일반 유저 
 * - ADMIN: 관리자
 * - SUPER_ADMIN: 슈퍼 관리자
 */

// 권한 열거형 (Prisma enum과 동일)
import { UserRole as PrismaUserRole } from "@prisma/client";
export type UserRole = PrismaUserRole;
export const UserRole = PrismaUserRole;

// 권한 레벨 정의 (숫자가 높을수록 상위 권한)
export const ROLE_LEVELS = {
  [UserRole.NONE]: 0,
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3
} as const;

// 권한 표시명
export const ROLE_NAMES = {
  [UserRole.NONE]: '권한 없음',
  [UserRole.USER]: '일반 유저',
  [UserRole.ADMIN]: '관리자',
  [UserRole.SUPER_ADMIN]: '슈퍼 관리자'
} as const;

// 글로벌 권한 정의 (기존 Permission과 동일)
export interface GlobalPermission {
  // 게시판 권한
  canViewPosts: boolean;
  canCreatePosts: boolean;
  canEditOwnPosts: boolean;
  canDeleteOwnPosts: boolean;
  canEditAllPosts: boolean;
  canDeleteAllPosts: boolean;
  
  // 사용자 관리 권한
  canViewUserList: boolean;
  canManageUsers: boolean;
  canChangeUserRoles: boolean;
  
  // 관리자 권한
  canAccessAdminPanel: boolean;
  canManageAdmins: boolean;
}

// 게시판별 권한 정의
export interface BoardPermission {
  canRead: boolean;
  canWrite: boolean;
  canModerate: boolean; // 게시글 수정/삭제 권한
}

// 하위 호환성을 위해 Permission 타입 유지
export type Permission = GlobalPermission;

/**
 * 역할별 글로벌 권한 정의
 */
export const GLOBAL_PERMISSIONS: Record<UserRole, GlobalPermission> = {
  [UserRole.NONE]: {
    canViewPosts: false,
    canCreatePosts: false,
    canEditOwnPosts: false,
    canDeleteOwnPosts: false,
    canEditAllPosts: false,
    canDeleteAllPosts: false,
    canViewUserList: false,
    canManageUsers: false,
    canChangeUserRoles: false,
    canAccessAdminPanel: false,
    canManageAdmins: false
  },
  
  [UserRole.USER]: {
    canViewPosts: true,
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canEditAllPosts: false,
    canDeleteAllPosts: false,
    canViewUserList: false,
    canManageUsers: false,
    canChangeUserRoles: false,
    canAccessAdminPanel: false,
    canManageAdmins: false
  },
  
  [UserRole.ADMIN]: {
    canViewPosts: true,
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canEditAllPosts: true,
    canDeleteAllPosts: true,
    canViewUserList: true,
    canManageUsers: true,
    canChangeUserRoles: false,
    canAccessAdminPanel: true,
    canManageAdmins: false
  },
  
  [UserRole.SUPER_ADMIN]: {
    canViewPosts: true,
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canEditAllPosts: true,
    canDeleteAllPosts: true,
    canViewUserList: true,
    canManageUsers: true,
    canChangeUserRoles: true,
    canAccessAdminPanel: true,
    canManageAdmins: true
  }
};

// 하위 호환성을 위해 ROLE_PERMISSIONS 유지
export const ROLE_PERMISSIONS = GLOBAL_PERMISSIONS;

/**
 * 게시판별 기본 권한 정의 (새 게시판 생성 시 기본값)
 */
export const DEFAULT_BOARD_PERMISSIONS: Record<UserRole, BoardPermission> = {
  [UserRole.NONE]: {
    canRead: false,
    canWrite: false,
    canModerate: false
  },
  
  [UserRole.USER]: {
    canRead: true,
    canWrite: true,
    canModerate: false
  },
  
  [UserRole.ADMIN]: {
    canRead: true,
    canWrite: true,
    canModerate: true
  },
  
  [UserRole.SUPER_ADMIN]: {
    canRead: true,
    canWrite: true,
    canModerate: true
  }
};

/**
 * 사용자 권한 체크 함수들
 */

// 글로벌 권한 체크
export function hasGlobalPermission(userRole: UserRole, permission: keyof GlobalPermission): boolean {
  return GLOBAL_PERMISSIONS[userRole][permission];
}

// 하위 호환성을 위한 기존 함수 유지
export function hasPermission(userRole: UserRole, permission: keyof Permission): boolean {
  return GLOBAL_PERMISSIONS[userRole][permission];
}

// 게시판 권한 체크
export function hasBoardPermission(
  userRole: UserRole, 
  boardSlug: string, 
  permission: keyof BoardPermission,
  boardPermissions: Record<string, Record<UserRole, BoardPermission>>
): boolean {
  // 슈퍼관리자는 항상 모든 권한 있음
  if (userRole === UserRole.SUPER_ADMIN) return true;
  
  // 해당 게시판이 권한 설정에 없으면 기본 권한 사용
  if (!boardPermissions[boardSlug]) {
    return DEFAULT_BOARD_PERMISSIONS[userRole][permission];
  }
  
  return boardPermissions[boardSlug][userRole][permission];
}

// 최소 권한 레벨 체크
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minimumRole];
}

// 관리자 권한 체크 (ADMIN 이상)
export function isAdmin(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, UserRole.ADMIN);
}

// 슈퍼 관리자 권한 체크
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.SUPER_ADMIN;
}

// 사용자 글로벌 권한 정보 가져오기
export function getGlobalPermissions(userRole: UserRole): GlobalPermission {
  return GLOBAL_PERMISSIONS[userRole];
}

// 하위 호환성을 위한 기존 함수 유지
export function getUserPermissions(userRole: UserRole): Permission {
  return GLOBAL_PERMISSIONS[userRole];
}

// 역할명 가져오기
export function getRoleName(userRole: UserRole): string {
  return ROLE_NAMES[userRole];
}

// 사용 가능한 역할 목록 (특정 역할이 설정할 수 있는)
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  if (userRole === UserRole.SUPER_ADMIN) {
    return [UserRole.USER, UserRole.ADMIN]; // 슈퍼 관리자는 USER, ADMIN 역할 부여 가능
  }
  if (userRole === UserRole.ADMIN) {
    return [UserRole.USER]; // 관리자는 USER 역할만 부여 가능
  }
  return []; // 다른 역할은 권한 부여 불가
}

// 게시판별 권한 매핑 (게시판 슬러그 -> 역할별 권한)
export interface BoardPermissionMap {
  [boardSlug: string]: Record<UserRole, BoardPermission>;
}

// 게시판 권한 라벨
export const BOARD_PERMISSION_LABELS: Record<keyof BoardPermission, string> = {
  canRead: '읽기',
  canWrite: '쓰기',
  canModerate: '관리'
};
