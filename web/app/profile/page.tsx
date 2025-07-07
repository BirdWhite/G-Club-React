'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ProfileData {
  fullName: string;
  profileImage: string | null;
  birthDate: string;
  [key: string]: any;
}

import type { User } from '@/types/models';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      fetchProfile();
    }
  }, [status, session, router]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('프로필을 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      console.error('프로필 로딩 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 클라이언트 사이드에서만 렌더링
  if (!isClient) {
    return null;
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
          <Link 
            href="/login" 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }
  
  // 사용자 ID 표시
  const formatUserId = (userId?: string) => {
    if (!userId) return 'ID: 알 수 없음';
    return `ID: ${userId}`;
  };

  const user = session.user as User;
  const displayName = profile?.fullName || user.name || '사용자';
  const createdAt = user?.createdAt ? new Date(user.createdAt) : new Date();
  const formattedDate = createdAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // 생년월일 포맷팅
  const formattedBirthDate = profile?.birthDate 
    ? new Date(profile.birthDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // 시간대 문제 방지
      })
    : '미등록';

  const getRoleLabel = (role?: string) => {
    if (!role) return '게스트';
    const roles: Record<string, string> = {
      'USER': '일반 사용자',
      'ADMIN': '관리자',
      'SUPER_ADMIN': '최고 관리자',
      'NONE': '게스트'
    };
    return roles[role] || role;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 프로필 이미지 */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-blue-100">
            {profile?.profileImage ? (
              <Image
                src={profile.profileImage}
                alt={displayName}
                fill
                className="object-cover"
                priority
              />
            ) : user?.image ? (
              <Image
                src={user.image}
                alt={displayName}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                <span className="text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* 프로필 정보 */}
          <div className="flex-1">
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {displayName}
              </h1>
              <p className="text-gray-500 text-sm mb-4">{formatUserId(user?.id)}</p>
              <Link 
                href="/profile/edit"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm md:text-base w-fit"
              >
                프로필 수정
              </Link>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">생년월일</h3>
                <p className="mt-1 text-gray-800">
                  {formattedBirthDate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">가입일</h3>
                <p className="mt-1 text-gray-800">
                  {formattedDate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">권한</h3>
                <p className="mt-1 text-gray-800">
                  {getRoleLabel(user?.role as string)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 내 활동 섹션 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">내 활동</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/my-posts" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-800">작성한 글</h3>
              <p className="text-sm text-gray-500 mt-1">내가 작성한 게시글 보기</p>
            </Link>
            
            <Link href="/my-comments" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-800">댓글</h3>
              <p className="text-sm text-gray-500 mt-1">내가 작성한 댓글 보기</p>
            </Link>
            
            <Link href="/saved" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-800">저장됨</h3>
              <p className="text-sm text-gray-500 mt-1">저장한 콘텐츠 보기</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
