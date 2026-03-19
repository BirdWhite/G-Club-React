'use server';

import { createServerClient } from './server';
import prisma from '../prisma';
import type { User } from '@supabase/supabase-js';
import type { Role, UserProfile } from '@prisma/client';

export type ExtendedUser = Omit<User, 'role'> & {
  role: Role | null;
  profile: UserProfile | null;
};

export async function getCurrentUser(): Promise<ExtendedUser | null> {
  const supabase = await createServerClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: {
        role: true,
      },
    });

    if (!userProfile) {
      return null;
    }
    
    // Supabase User에서 role 필드를 제외하고 우리 시스템의 Role과 Profile을 결합합니다.
    const userWithoutRole = user as Omit<User, 'role'>;
    
    return {
      ...userWithoutRole,
      role: userProfile.role,
      profile: userProfile,
    };

  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return { redirect: { destination: '/login', permanent: false } };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: { user } };
}
