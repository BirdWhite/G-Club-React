'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '@/hooks/useAuth';

// 프로필 데이터 타입 정의
interface ProfileData {
  fullName: string;
  birthDate: string;
  profileImage: string | null;
}

export default function Header() {
  // 현재 로그인 세션 데이터
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // 프로필 데이터 상태
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // 프로필 메뉴 열림 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // 현재 경로에 따라 활성 메뉴 스타일 반환
  const getNavLinkClass = (path: string) => {
    const isActive = pathname === path || 
                    (path === '/game-mate' && pathname.startsWith('/game-mate')) ||
                    (path === '/board' && pathname.startsWith('/board')) ||
                    (path === '/my-page' && pathname.startsWith('/my-page'));
    
    const baseClass = 'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium';
    const activeClass = 'border-indigo-500 text-gray-900';
    const inactiveClass = 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';
    
    return `${baseClass} ${isActive ? activeClass : inactiveClass}`;
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
  
  const { isAdmin } = useAuth();
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-xl font-bold text-indigo-600">G-Club</span>
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className={getNavLinkClass('/')}>
                홈
              </Link>
              <Link href="/board" className={getNavLinkClass('/board')}>
                채널
              </Link>
              <Link href="/game-mate" className={getNavLinkClass('/game-mate')}>
                게임메이트
              </Link>
              {session && isAdmin() && (
                <Link 
                  href="/admin/dashboard" 
                  className={getNavLinkClass('/admin/dashboard')}
                >
                  관리자 대시보드
                </Link>
              )}
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {session ? (
              <div className="flex items-center space-x-2">
                {/* 로그아웃 드롭다운 */}
                <Menu as="div" className="relative">
                  <div>
                    <Menu.Button className="flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/profile"
                            className={`block w-full px-4 py-2 text-left text-sm ${
                              active ? 'bg-gray-100' : ''
                            }`}
                          >
                            내 프로필
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                            className={`block w-full px-4 py-2 text-left text-sm ${
                              active ? 'bg-gray-100' : ''
                            }`}
                          >
                            로그아웃
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>

                {/* 프로필 사진 */}
                <Link 
                  href="/profile" 
                  className="group relative flex rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <span className="sr-only">프로필 페이지로 이동</span>
                  {profileData?.profileImage ? (
                    <div className="relative h-8 w-8 rounded-full border-2 border-gray-200 overflow-hidden transition-all duration-200 group-hover:ring-2 group-hover:ring-indigo-500 group-hover:ring-offset-2">
                      <Image
                        className="absolute inset-0 m-auto object-cover w-full h-full transition-transform duration-200 group-hover:scale-110"
                        src={profileData.profileImage}
                        alt={profileData.fullName || '프로필 이미지'}
                        width={32}
                        height={32}
                      />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-100 text-gray-500 transition-all duration-200 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      <span className="text-sm font-medium">
                        {profileData?.fullName?.[0] || '?'}
                      </span>
                    </div>
                  )}
                </Link>
              </div>
            ) : (
              <button
                onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                로그인
              </button>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
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
            className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
          >
            홈
          </Link>
          <Link
            href="/board"
            className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
          >
            게시판
          </Link>
          <Link
            href="/game-mate"
            className="border-indigo-500 bg-indigo-50 text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
          >
            게임메이트
          </Link>
          {session && (
            <Link
              href="/my-page"
              className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
            >
              마이페이지
            </Link>
          )}
        </div>
        {!session && (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="space-y-1">
              <button
                onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
                onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
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
