'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileProvider';
import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MembershipPendingPage } from '@/components/MembershipPendingPage';

interface ProfilePageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const { profile: currentUserProfile, isLoading: currentUserLoading, error: currentUserError } = useProfile();
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const { userId } = use(params);
  const isOwnProfile = currentUserProfile?.userId === userId;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 프로필 데이터 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      
      try {
        if (isOwnProfile && currentUserProfile) {
          // 자신의 프로필인 경우 현재 프로필 데이터 사용
          setTargetProfile(currentUserProfile);
        } else {
          // 다른 사용자의 프로필인 경우 API에서 조회
          const response = await fetch(`/api/profile/${userId}`);
          if (response.ok) {
            const data = await response.json();
            setTargetProfile(data.profile);
          } else if (response.status === 401) {
            // 인증되지 않은 사용자인 경우 로그인 페이지로 리다이렉트
            router.push('/auth/login');
          } else {
            console.error('프로필을 불러올 수 없습니다.');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('프로필 로드 중 오류:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserLoading) return; // 현재 사용자 프로필 로딩 중이면 대기
    
    loadProfile();
  }, [userId, isOwnProfile, currentUserProfile, currentUserLoading, router]);

  if (isLoading || currentUserLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (currentUserError && !isOwnProfile) {
    // 현재 사용자가 로그인하지 않은 상태에서 다른 사용자 프로필 조회 시
    router.push('/auth/login');
    return null;
  }
  
  if (!targetProfile) {
    router.push('/');
    return null;
  }

  // NONE 역할 사용자는 자신의 프로필이 아닌 경우에만 대기 페이지 표시
  if (targetProfile.role?.name === 'NONE' && !isOwnProfile) {
    return <MembershipPendingPage />;
  }

  // 사용자 ID 표시
  const formatUserId = (userId?: string) => {
    if (!userId) return 'ID: 알 수 없음';
    return `ID: ${userId}`;
  };

  const displayName = targetProfile.name || '사용자';
  const createdAt = targetProfile.createdAt ? new Date(targetProfile.createdAt) : new Date();
  
  // isMounted가 true일 때만 날짜를 포맷팅하여 보여줍니다.
  const formattedDate = isMounted ? createdAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '...';
  
  // 생년월일 포맷팅
  const formattedBirthDate = isMounted && targetProfile?.birthDate 
    ? new Date(targetProfile.birthDate).toLocaleDateString('ko-KR', {
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
      <div className="profile-card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 프로필 이미지 */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-blue-100 bg-white">
            {targetProfile.image ? (
              <Image
                src={targetProfile.image}
                alt={displayName}
                fill
                className="object-cover"
                priority
                unoptimized={targetProfile.image.includes('127.0.0.1') || targetProfile.image.includes('pnu-ultimate.kro.kr')} // 로컬 및 개발 서버 이미지 최적화 비활성화
              />
            ) : (
              <div className="w-full h-full bg-white flex items-center justify-center text-gray-500">
                <span className="text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* 프로필 정보 */}
          <div className="flex-1">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">{targetProfile.name || '사용자'}</h1>
              <p className="text-gray-500 text-sm mb-4">{formatUserId(targetProfile.userId)}</p>
              {isOwnProfile && (
                <Link 
                  href="/profile/edit"
                  className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm md:text-base w-fit"
                >
                  프로필 수정
                </Link>
              )}
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
                  {getRoleLabel(targetProfile.role?.name)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 내 활동 섹션 - 자신의 프로필이면서 NONE 역할이 아닐 때만 표시 */}
        {isOwnProfile && targetProfile.role?.name !== 'NONE' && (
          <div className="mt-8 pt-6 border-t border-cyber-black-300">
            <h2 className="text-xl font-semibold text-cyber-gray mb-4">내 활동</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/my-posts" className="p-4 bg-cyber-black-100 rounded-lg hover:bg-cyber-black-200 transition-colors border border-cyber-black-300">
                <h3 className="font-medium text-cyber-gray">작성한 글</h3>
                <p className="text-sm text-cyber-darkgray mt-1">내가 작성한 게시글 보기</p>
              </Link>
              
              <Link href="/my-comments" className="p-4 bg-cyber-black-100 rounded-lg hover:bg-cyber-black-200 transition-colors border border-cyber-black-300">
                <h3 className="font-medium text-cyber-gray">댓글</h3>
                <p className="text-sm text-cyber-darkgray mt-1">내가 작성한 댓글 보기</p>
              </Link>
              
              <Link href="/saved" className="p-4 bg-cyber-black-100 rounded-lg hover:bg-cyber-black-200 transition-colors border border-cyber-black-300">
                <h3 className="font-medium text-cyber-gray">저장됨</h3>
                <p className="text-sm text-cyber-darkgray mt-1">저장한 콘텐츠 보기</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
