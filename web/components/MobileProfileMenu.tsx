'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/contexts/ProfileProvider';

interface MobileProfileMenuProps {
  profile: any;
}

interface MenuItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isButton?: boolean;
}

export default function MobileProfileMenu({ profile }: MobileProfileMenuProps) {
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
      href: '/my-games',
      label: '내 게임 내역',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
    {
      onClick: handleSignOut,
      label: '로그아웃',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      isButton: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl md:hidden">
      {/* 프로필 정보 섹션 */}
      <div className="mb-6">
        <div className="bg-cyber-black-100 rounded-lg p-6 border border-cyber-black-300">
          <div className="flex items-center space-x-4">
            {/* 프로필 이미지 */}
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-cyber-blue/30 bg-white">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt={profile.name || '프로필 이미지'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-cyber-gray/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-cyber-gray">
                    {profile?.name?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            
            {/* 프로필 정보 */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-cyber-gray">{profile?.name || '사용자'}</h3>
              <p className="text-cyber-darkgray text-sm">ID: {profile?.userId || '알 수 없음'}</p>
              {profile?.email && (
                <p className="text-cyber-darkgray text-sm">{profile.email}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 메뉴 아이템들 */}
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.isButton ? (
              <button
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-4 bg-cyber-black-50 rounded-lg hover:bg-cyber-black-200 transition-colors duration-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-cyber-gray">
                    {item.icon}
                  </div>
                  <span className="text-cyber-gray font-medium">{item.label}</span>
                </div>
                <svg className="w-5 h-5 text-cyber-darkgray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <Link
                href={item.href!}
                className="w-full flex items-center justify-between p-4 bg-cyber-black-50 rounded-lg hover:bg-cyber-black-200 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-cyber-gray">
                    {item.icon}
                  </div>
                  <span className="text-cyber-gray font-medium">{item.label}</span>
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
