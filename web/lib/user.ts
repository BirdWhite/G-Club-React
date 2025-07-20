import prisma from '@/lib/prisma';
import type { UserProfile, Role, Permission } from '@prisma/client';

export type FullUserProfile = UserProfile & {
  role: (Role & {
    permissions: Permission[];
  }) | null;
};

/**
 * 사용자 ID를 기반으로 역할과 권한 정보가 포함된 전체 사용자 프로필을 조회합니다.
 * @param userId 조회할 사용자의 Supabase Auth ID
 * @returns 역할과 권한이 포함된 사용자 프로필 객체, 없으면 null
 */
export async function getUserProfile(userId: string | undefined): Promise<FullUserProfile | null> {
  if (!userId) {
    return null;
  }

  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
    return userProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
} 