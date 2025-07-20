'use server';

import { createClient } from './server';
import prisma from '@/lib/prisma';

export async function getCurrentUser() {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!userProfile) {
      // Supabase에는 유저가 있지만, 우리 DB에 프로필이 없는 경우
      // 이 경우, 기본적인 사용자 정보만 반환하거나, 혹은 null을 반환할 수 있다.
      // 여기서는 role이 없는 기본 user 객체를 반환하는 것보다,
      // 우리 시스템상 '불완전한 사용자'로 간주하고 null 처리하는게 나을 수 있음.
      // 하지만 다른 곳에서 user 객체 자체를 필요로 할 수 있으니, role만 없는 상태로 반환
       return { ...user, role: null };
    }
    
    return {
      ...user,
      role: userProfile.role?.name || null, // 'ADMIN' or 'USER' 등
      profile: userProfile, // 필요 시 전체 프로필 정보 사용 가능
    };

  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function signOut() {
  const supabase = await createClient();
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
