'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileProvider';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, error } = useProfile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    // 프로필 로딩 실패 시 (예: 프로필이 없는 경우) 등록 페이지로 이동
    // ProfileProvider에서 프로필이 null일 때의 처리를 이미 하고 있다면 이 부분은 더 단순화될 수 있습니다.
    router.push('/profile/register');
    return null; // 리다이렉트 중에는 아무것도 렌더링하지 않음
  }
  
  if (!profile) {
    // 로딩이 끝났지만 프로필이 없는 경우 (예: 로그아웃 상태)
    // 혹은 아직 생성되지 않은 경우
    router.push('/auth/login');
    return null;
  }

  // 사용자 ID 표시
  const formatUserId = (userId?: string) => {
    if (!userId) return 'ID: 알 수 없음';
    return `ID: ${userId}`;
  };

  const displayName = profile.name || '사용자';
  const createdAt = profile.createdAt ? new Date(profile.createdAt) : new Date();
  
  // isMounted가 true일 때만 날짜를 포맷팅하여 보여줍니다.
  const formattedDate = isMounted ? createdAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '...';
  
  // 생년월일 포맷팅
  const formattedBirthDate = isMounted && profile?.birthDate 
    ? new Date(profile.birthDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // 시간대 문제 방지
      })
    : '...';

  const getRoleLabel = (roleName?: string) => {
    if (!roleName) return '일반 사용자';
    
    const roles: Record<string, string> = {
      USER: '일반 사용자',
      ADMIN: '관리자',
      SUPER_ADMIN: '최고 관리자',
      NONE: '역할 없음'
    };
    return roles[roleName] || roleName;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 프로필 이미지 */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-blue-100">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={displayName}
                fill
                className="object-cover"
                priority
                unoptimized={profile.image.includes('127.0.0.1') || profile.image.includes('pnu-ultimate.kro.kr')} // 로컬 및 개발 서버 이미지 최적화 비활성화
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
              <h1 className="text-2xl font-bold">{profile.name || '사용자'}</h1>
              <p className="text-gray-500 text-sm mb-4">{formatUserId(profile.userId)}</p>
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
                  {getRoleLabel(profile.role?.name)}
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
