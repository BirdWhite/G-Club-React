'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, Fragment, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Menu, Transition } from '@headlessui/react';
import { useProfile } from '@/contexts/ProfileProvider'; // 1. useProfile 훅 임포트

// 프로필 데이터 타입 정의
interface ProfileData {
  fullName: string;
  birthDate: string;
  image?: string | null;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { profile } = useProfile(); // 2. useProfile 훅 호출
  const isAdmin = profile?.role?.name === 'ADMIN' || profile?.role?.name === 'SUPER_ADMIN'; // 3. isAdmin 변수 생성
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    try {
      // 1. 먼저 세션 확인
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setSession(null);
        return null;
      }

      // 2. 세션이 있는 경우에만 사용자 정보 가져오기
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      setSession(user ? { user } : null);
      return user;
    } catch (error) {
      console.error('사용자 정보를 가져오는 중 오류 발생:', error);
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    // 초기 사용자 정보 로드
    fetchUser();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변경 감지:', event);
        
        // 세션 상태 업데이트
        setSession(session);
        
        // 로그아웃 시 메인 페이지로 리다이렉트
        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
        // 로그인 성공 시 프로필 페이지로 리다이렉트 (로그인 페이지에서만)
        else if (event === 'SIGNED_IN' && pathname === '/auth/login') {
          router.push('/profile');
        }
      }
    );

    // 페이지 가시성 변경 시 사용자 정보 갱신
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 클린업 함수
    return () => {
      // 구독 해제
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser, router, supabase.auth, pathname]);
  
  // 프로필 데이터 상태
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // 프로필 메뉴 열림 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // 클라이언트 사이드에서만 실행되는 NavLink 컴포넌트
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = href === '/' ? pathname === href : pathname?.startsWith(href);
    
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
    const loadProfile = async () => {
      if (session?.user) {
        try {
          await fetchProfileData();
        } catch (error) {
          console.error('프로필 로드 중 오류:', error);
        }
      } else {
        // 세션이 없을 때 프로필 데이터 초기화
        setProfileData(null);
      }
    };
    
    loadProfile();
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
      // 먼저 세션 확인
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession) {
        setProfileData(null);
        return;
      }
      
      // 세션이 있으면 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('사용자 정보를 가져올 수 없습니다:', userError);
        setProfileData(null);
        return;
      }
      
      // 프로필 정보 가져오기
      const res = await fetch('/api/profile');
      
      if (!res.ok) {
        throw new Error('프로필을 불러오는데 실패했습니다.');
      }
      
      const data = await res.json();
      if (data.profile) {
        setProfileData({
          fullName: data.profile.fullName,
          birthDate: data.profile.birthDate,
          image: data.profile.image
        });
      } else {
        setProfileData(null);
      }
    } catch (error) {
      console.error('프로필 정보 불러오기 실패:', error);
      setProfileData(null);
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
  
  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      // 먼저 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // 이미 로그아웃된 상태
        window.location.href = '/';
        return;
      }
      
      // 로그아웃 시도
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 상태 초기화
      setSession(null);
      setProfileData(null);
      
      // 홈페이지로 리다이렉트 (새로고침하여 모든 상태 초기화)
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 오류가 발생해도 강제로 로그아웃 처리
      setSession(null);
      setProfileData(null);
      window.location.href = '/';
    }
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
              {isMounted && (
                <>
                  <NavLink href="/">홈</NavLink>
                  <NavLink href="/channels">채널</NavLink>
                  <NavLink href="/game-mate">게임메이트</NavLink>
                  {/* 4. isAdmin일 때만 관리자 대시보드 링크 표시 */}
                  {isAdmin && (
                    <NavLink href="/admin/dashboard">
                      관리자 대시보드
                    </NavLink>
                  )}
                </>
              )}
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isMounted && (
              <>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    {/* 로딩 스피너 */}
                  </div>
                ) : session ? (
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
                      {profileData?.image ? (
                        <div className="relative h-8 w-8 rounded-full border-2 border-opacity-30 overflow-hidden transition-all duration-200 bg-white">
                          <Image
                            className="absolute inset-0 m-auto object-cover w-full h-full transition-transform duration-200 group-hover:scale-110"
                            src={profileData.image}
                            alt={profileData.fullName || '프로필 이미지'}
                            width={32}
                            height={32}
                            unoptimized={profileData.image.includes('127.0.0.1')}
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
              </>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed. */}
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      <Transition
        show={isMobileMenuOpen}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div className="sm:hidden" id="mobile-menu">
            <div className="pt-2 pb-3 space-y-1">
              {isMounted && (
                <>
                  <Link href="/" className="nav-link-mobile">홈</Link>
                  <Link href="/channels" className="nav-link-mobile">채널</Link>
                  <Link href="/game-mate" className="nav-link-mobile">게임메이트</Link>
                  {session && (
                      <Link href="/profile" className="nav-link-mobile">마이페이지</Link>
                  )}
                </>
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
                    {profileData?.image ? (
                      <div className="p-0.5 bg-white rounded-full">
                      <Image
                        src={profileData.image}
                        alt={profileData.fullName || '프로필 이미지'}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        unoptimized={profileData.image.includes('127.0.0.1')} // 로컬 이미지 최적화 비활성화
                      />
                      </div>
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
      </Transition>
    </header>
  );
}
