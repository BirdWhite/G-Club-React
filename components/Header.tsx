'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  
  // 프로필 데이터 상태
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // 프로필 메뉴 열림 상태
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
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
    <header className="bg-primary shadow-md">
      {/* 헤더 내용 컨테이너 - 최대 너비 제한, 좌우 패딩 */}
      <div className="container mx-auto p-4">
        {/* 네비게이션 플렉스 컨테이너 - 로고와 메뉴 항목 배치 */}
        <div className="flex justify-between items-center">
          
          {/* 로고 및 홈 링크 */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-lg font-bold text-white hover:text-gray-200">
              G-Club
            </Link>
          </div>
          
          {/* 네비게이션 메뉴 */}
          <div className="flex items-center space-x-4">
            {session ? (
              // 로그인 상태일 때 표시되는 메뉴
              <div 
                className="relative"
                onMouseEnter={() => setIsProfileMenuOpen(true)}
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                {/* 프로필 이미지 */}
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-md hover:border-blue-300 transition-colors cursor-pointer">
                  <Image 
                    src={profileData?.profileImage || '/images/default-profile.png'} 
                    alt="프로필" 
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* 프로필 메뉴 */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-0 w-56 z-50">
                    {/* 투명한 상단 영역 (프로필 사진 포함) */}
                    <div className="h-12 w-full"></div>
                    
                    {/* 실제 메뉴 영역 */}
                    <div className="bg-background rounded-md shadow-lg py-2 border border-gray-900">
                      {/* 프로필 정보 섹션 */}
                      {profileData && (
                        <div className="px-4 py-2 border-b border-gray-900">
                          <p className="text-sm font-medium text-gray-900">
                            {profileData.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {calculateAge(profileData.birthDate)}세
                          </p>
                        </div>
                      )}
                      
                      {/* 메뉴 항목들 */}
                      <Link 
                        href="/profile/edit" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-background-hover transition-colors"
                      >
                        프로필 수정
                      </Link>
                      {isAdmin() && (
                        <Link 
                          href="/admin/dashboard" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-background-hover transition-colors"
                        >
                          관리자 대시보드
                        </Link>
                      )}
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-background-hover cursor-pointer transition-colors"
                        onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                      >
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 로그아웃 상태일 때 표시되는 로그인 링크
              <Link href="/login" className="text-white hover:text-gray-200 transition-colors">
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
