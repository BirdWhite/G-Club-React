import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * 프로필 체크 훅
 * 
 * 프로필 존재 여부를 체크하여 프로필 등록 페이지로 리다이렉션합니다.
 * 인증 확인은 미들웨어에서 처리됩니다.
 * 
 * @returns {isLoading} 로딩 상태
 */
/**
 * 프로필 체크 훅
 * 
 * 메인 페이지에서만 사용되며, 프로필이 없는 경우에만 프로필 등록 페이지로 리다이렉션합니다.
 * 프로필 페이지에서는 사용하지 마세요.
 * 
 * @returns {isLoading} 로딩 상태
 */
export const useProfileCheck = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkProfile = async () => {
      try {
        // 현재 경로가 프로필 관련 경로인지 확인
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/profile')) {
          setIsLoading(false);
          return;
        }

        // PWA 관련 파일들은 프로필 체크에서 제외
        if (currentPath === '/manifest.json' || currentPath === '/sw.js' || currentPath.startsWith('/icons/')) {
          setIsLoading(false);
          return;
        }

        // 프로필 존재 여부 확인 API 호출
        const response = await fetch('/api/profile/check');
        
        // 401 에러는 인증되지 않은 사용자이므로 로그인 페이지로 리다이렉트
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        
        // 404 에러는 프로필이 없는 경우이므로 무시
        if (response.status === 404) {
          router.push('/profile/register');
          return;
        }
        
        if (!response.ok) {
          console.error('프로필 확인 중 오류 발생:', await response.text());
          return;
        }

        const data = await response.json();
        
        // 프로필이 없으면 프로필 등록 페이지로 이동
        if (!data.hasProfile) {
          router.push('/profile/register');
          return;
        }

        // NONE 역할 사용자는 홈 페이지에 머물도록 함 (홈 페이지에서 MembershipPendingPage 표시)
        // 프로필 페이지 접근은 허용하되, 다른 기능은 제한
      } catch (error) {
        console.error('프로필 확인 중 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, [router]); // router 의존성 복구

  return { isLoading };
};
