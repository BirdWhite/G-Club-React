'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu, Transition } from '@headlessui/react';

// 프로필 데이터 타입 정의
interface ProfileData {
  fullName: string;
  birthDate: string;
  profileImage: string | null;
}

export default function Header() {
  const pathname = usePathname();
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 현재 사용자 정보 가져오기
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setSession({ user });
      } catch (error) {
        console.error('사용자 정보를 가져오는 중 오류 발생:', error);
      }
    };

    // 초기 사용자 정보 로드
    getUser();

    // 페이지 포커스 시 사용자 정보 갱신
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getUser();
      }
    };

    // 페이지 가시성 변경 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 클린업 함수
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // 프로필 데이터 상태
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // 프로필 메뉴 열림 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // 클라이언트 사이드에서만 실행되는 NavLink 컴포넌트
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href || 
                    (href === '/game-mate' && pathname?.startsWith('/game-mate')) ||
                    (href === '/board' && pathname?.startsWith('/board')) ||
                    (href === '/my-page' && pathname?.startsWith('/my-page'));
    
    return (
      <Link 
        href={href}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
          isActive ? 'nav-link-active' : 'nav-link'
        }`}
      >
        {children}
      </Link>
    );
  };
  
  // 로그인 세션이 변경될 때 프로필 데이터를 불러옵니다.
  useEffect(() => {
    if (session?.user) {
      fetchProfileData();
    }
  }, [session]);
  
  // 페이지 포커스 시와 프로필 업데이트 이벤트 시 프로필 데이터 새로고침
  useEffect(() => {
    if (!session?.user) return;
    
    // 페이지 포커스 시 프로필 데이터 새로고침
    const handleFocus = () => {
      fetchProfileData();
    };
    
    // 프로필 업데이트 이벤트 리스너
    const handleProfileUpdate = () => {
      fetchProfileData();
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('focus', handleFocus);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [session?.user]);
  
  // 프로필 데이터를 서버에서 불러오는 함수
  const fetchProfileData = async () => {
    try {
      const res = await fetch('/api/profile');
      
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfileData({
            fullName: data.profile.fullName,
            birthDate: data.profile.birthDate,
            profileImage: data.profile.profileImage
          });
        }
      }
    } catch (error) {
      console.error('프로필 정보 불러오기 실패:', error);
    }
  };

  // 생년월일로부터 한국식 나이 계산 함수
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    
    // 한국식 나이: 현재 연도 - 태어난 연도 + 1
    const koreanAge = today.getFullYear() - birth.getFullYear() + 1;
    
    return koreanAge;
  };
  
  const isAdmin = false;
  
  // 로그아웃 처리
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  
  return (
    <header className="header-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="header-logo text-xl font-bold">G-Club</span>
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink href="/">
                홈
              </NavLink>
              <NavLink href="/board">
                채널
              </NavLink>
              <NavLink href="/game-mate">
                게임메이트
              </NavLink>
              {session && isAdmin && (
                <NavLink href="/admin/dashboard">
                  관리자 대시보드
                </NavLink>
              )}
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {session ? (
              <div className="flex items-center space-x-2">
                {/* 로그아웃 드롭다운 */}
                <Menu as="div" className="relative">
                  <div>
                    <Menu.Button className="flex items-center justify-center rounded-full p-1 hover:bg-opacity-10 focus:outline-none">
                      <span className="sr-only">로그아웃 메뉴 열기</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Menu.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md border py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-sm">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/profile"
                            className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-opacity-10' : ''}`}
                          >
                            내 프로필
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleSignOut}
                            className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-opacity-10' : ''}`}
                          >
                            로그아웃
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>

                {/* 프로필 사진 */}
                <Link href="/profile" className="group relative flex rounded-full focus:outline-none">
                  <span className="sr-only">프로필 페이지로 이동</span>
                  {profileData?.profileImage ? (
                    <div className="relative h-8 w-8 rounded-full border-2 border-opacity-30 overflow-hidden transition-all duration-200">
                      <Image
                        className="absolute inset-0 m-auto object-cover w-full h-full transition-transform duration-200 group-hover:scale-110"
                        src={profileData.profileImage}
                        alt={profileData.fullName || '프로필 이미지'}
                        width={32}
                        height={32}
                      />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyber-gray/30 bg-cyber-gray/10 text-cyber-gray transition-all duration-200 group-hover:bg-cyber-blue/20 group-hover:text-cyber-blue">
                      <span className="text-sm font-medium">
                        {profileData?.fullName?.[0] || '?'}
                      </span>
                    </div>
                  )}
                </Link>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-cyber-black bg-cyber-blue hover:bg-cyber-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-blue focus:ring-offset-cyber-black transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-cyber-gray/70 hover:text-cyber-gray hover:bg-cyber-gray/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyber-blue focus:ring-offset-cyber-black"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">메인 메뉴 열기</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className="hidden h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden" id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/"
            className="border-transparent text-cyber-gray/70 hover:bg-cyber-gray/10 hover:border-cyber-gray/30 hover:text-cyber-gray block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
          >
            홈
          </Link>
          <Link
            href="/board"
            className="border-transparent text-cyber-gray/70 hover:bg-cyber-gray/10 hover:border-cyber-gray/30 hover:text-cyber-gray block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
          >
            채널
          </Link>
          <Link
            href="/game-mate"
            className="border-cyber-blue bg-cyber-blue/10 text-cyber-blue block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
          >
            게임메이트
          </Link>
          {session && isAdmin && (
            <Link
              href="/admin/dashboard"
              className="border-transparent text-cyber-gray/70 hover:bg-cyber-gray/10 hover:border-cyber-gray/30 hover:text-cyber-gray block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
            >
              관리자 대시보드
            </Link>
          )}
          {session && (
            <Link
              href="/my-page"
              className="border-transparent text-cyber-gray/70 hover:bg-cyber-gray/10 hover:border-cyber-gray/30 hover:text-cyber-gray block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
            >
              마이페이지
            </Link>
          )}
        </div>
        {!session && (
          <div className="pt-4 pb-3 border-t border-cyber-gray/20">
            <div className="space-y-1">
              <button
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left text-base font-medium text-cyber-gray/70 hover:bg-cyber-gray/10 hover:text-cyber-gray transition-colors"
              >
                로그인
              </button>
            </div>
          </div>
        )}
        {session && (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                {profileData?.profileImage ? (
                  <Image
                    className="h-10 w-10 rounded-full"
                    src={profileData.profileImage}
                    alt={profileData.fullName || '프로필 이미지'}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">
                      {profileData?.fullName?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {profileData?.fullName || '사용자'}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {session.user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={handleSignOut}
                className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
