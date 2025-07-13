'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  fullName: string;
  image?: string | null;
  birthDate: string;
  [key: string]: any;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
    
    // 사용자 정보 가져오기
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
        fetchProfile(user.id);
      } catch (error) {
        console.error('사용자 정보를 가져오는 중 오류 발생:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    // 초기 사용자 정보 로드
    getUser();
    
    // 페이지 가시성 변경 시 사용자 정보 갱신
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
  }, [router]);
  
  const fetchProfile = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // API를 통해 프로필 조회
      const response = await fetch('/api/profile/check', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('프로필 조회에 실패했습니다.');
      }
      
      const result = await response.json();
      
      // 프로필이 없는 경우 등록 페이지로 리다이렉트
      if (!result.hasProfile) {
        router.push('/profile/register');
        return;
      }
      
      // 프로필 데이터 설정
      setProfile(result.profile);
    } catch (error) {
      console.error('프로필 로딩 중 오류 발생:', error);
      setError('프로필을 불러오는 중 오류가 발생했습니다.');
      // 에러 발생 시에도 등록 페이지로 이동
      router.push('/profile/register');
    } finally {
      setIsLoading(false);
    }
  };

  // 클라이언트 사이드에서만 렌더링
  if (!isClient || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // 로그인 페이지로 리다이렉트 처리로 인해 여기까지 오지 않음
  }

  // 사용자 ID 표시
  const formatUserId = (userId?: string) => {
    if (!userId) return 'ID: 알 수 없음';
    return `ID: ${userId}`;
  };

  const displayName = user.user_metadata?.full_name || '사용자';
  const createdAt = user?.created_at ? new Date(user.created_at) : new Date();
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
    if (!role) return '일반 사용자';
    
    const roles: Record<string, string> = {
      user: '일반 사용자',
      admin: '관리자',
      premium: '프리미엄 사용자'
    };
    return roles[role] || role;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 프로필 이미지 */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-blue-100">
            {profile?.image ? (
              <Image
                src={profile.image}
                alt={displayName}
                fill
                className="object-cover"
                priority
                unoptimized={profile.image.includes('127.0.0.1')} // 로컬 이미지 최적화 비활성화
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
              <h1 className="text-2xl font-bold">{user.user_metadata?.full_name || '사용자'}</h1>
              <p className="text-gray-500 text-sm mb-4">{formatUserId(user.id)}</p>
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
                  {getRoleLabel(user.role)}
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
