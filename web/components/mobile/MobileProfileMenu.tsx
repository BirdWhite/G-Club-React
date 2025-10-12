'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/database/supabase';
import { Gamepad2 } from 'lucide-react';
import type { FullUserProfile } from '@/lib/user';

interface MobileProfileMenuProps {
  profile: FullUserProfile;
}

interface MenuItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isButton?: boolean;
  isLogout?: boolean;
}

export function MobileProfileMenu({ profile }: MobileProfileMenuProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      router.push('/');
    }
  };

  const isAdmin = profile?.role?.name === 'ADMIN' || profile?.role?.name === 'SUPER_ADMIN';

  const menuItems: MenuItem[] = [
    {
      href: '/profile/edit',
      label: '프로필 수정',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      href: '/profile/game-mate-history',
      label: '게임메이트 내역',
      icon: <Gamepad2 className="w-5 h-5" />
    },
    {
      href: '/profile/favorite-games',
      label: '관심 게임 설정',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      href: '/notifications/settings',
      label: '알람 설정',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    ...(isAdmin ? [{
      href: '/admin/dashboard',
      label: '관리자 대시보드',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }] : []),
    {
      onClick: handleSignOut,
      label: '로그아웃',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      isButton: true,
      isLogout: true
    }
  ];

  return (
    <div className="bg-background md:hidden grid grid-rows-[auto_1fr] h-full">
      {/* 상단 프로필 섹션 */}
      <div className="px-6 py-8">
        <div className="flex flex-col items-center text-center">
          {/* 프로필 이미지 */}
          <div className="relative mb-4">
            <button
              onClick={() => router.push('/profile/edit')}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-cyber-blue/30 bg-white hover:border-cyber-blue/50 transition-colors duration-200"
            >
              {profile?.image ? (
                <Image
                  src={profile.image}
                  alt={profile.name || '프로필 이미지'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-cyber-gray/20 flex items-center justify-center">
                  <span className="text-3xl font-bold text-cyber-gray">
                    {profile?.name?.[0] || '?'}
                  </span>
                </div>
              )}
            </button>
            {/* 연필 아이콘 */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-cyber-blue rounded-full flex items-center justify-center border-2 border-cyber-black-200">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          
          {/* 이름 */}
          <h1 className="text-2xl font-bold text-cyber-gray mb-2">
            {profile?.name || '사용자'}
          </h1>
          
          {/* 이메일 */}
          {profile?.email && (
            <p className="text-cyber-darkgray text-sm">
              {profile.email}
            </p>
          )}
        </div>
      </div>
      
      {/* 메뉴 버튼들 */}
      <div className="px-6 py-6 space-y-3 overflow-y-auto pb-16">
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.isButton ? (
              <button
                onClick={item.onClick}
                className={`w-full flex items-center justify-between p-4 transition-colors duration-200 text-left ${
                  item.isLogout 
                    ? 'hover:bg-red-500/10' 
                    : 'hover:bg-cyber-black-100/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={item.isLogout ? 'text-red-400' : 'text-cyber-gray'}>
                    {item.icon}
                  </div>
                  <span className={`font-medium text-base ${item.isLogout ? 'text-red-400' : 'text-cyber-gray'}`}>
                    {item.label}
                  </span>
                </div>
                <svg className={`w-5 h-5 ${item.isLogout ? 'text-red-400' : 'text-cyber-darkgray'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <Link
                href={item.href!}
                className="w-full flex items-center justify-between p-4 hover:bg-cyber-black-100/50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-cyber-gray">
                    {item.icon}
                  </div>
                  <span className="text-cyber-gray font-medium text-base">{item.label}</span>
                </div>
                <svg className="w-5 h-5 text-cyber-darkgray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
