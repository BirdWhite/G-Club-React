'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const { data: session } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (session?.user) {
      fetchProfileData();
    }
  }, [session]);
  
  const fetchProfileData = async () => {
    try {
      const res = await fetch('/api/profile');
      
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfileImage(data.profile.profileImage);
        }
      }
    } catch (error) {
      console.error('프로필 정보 불러오기 실패:', error);
    }
  };
  
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-lg font-bold hover:text-gray-600">
              G-Club
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {session ? (
              <div 
                className="relative"
                onMouseEnter={() => setIsProfileMenuOpen(true)}
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-md hover:border-blue-300 transition-colors cursor-pointer">
                  <Image 
                    src={profileImage || '/images/default-profile.png'} 
                    alt="프로필" 
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-0 w-48 z-50">
                    {/* 투명한 상단 영역 (프로필 사진 포함) */}
                    <div className="h-12 w-full"></div>
                    
                    {/* 실제 메뉴 영역 */}
                    <div className="bg-white rounded-md shadow-lg py-1 border border-gray-200">
                      <Link 
                        href="/profile/edit" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        프로필 수정
                      </Link>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                      >
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="text-gray-600 hover:text-gray-800 transition-colors">
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
