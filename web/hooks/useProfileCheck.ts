import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * 프로필 체크 훅
 * 
 * 세션 상태를 확인하고 프로필 존재 여부를 체크하여 적절한 페이지로 리다이렉션합니다.
 * 
 * @returns {isLoading} 로딩 상태
 */
export const useProfileCheck = () => {
  // 세션 데이터와 상태를 가져옵니다.
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 세션 상태 변화 감지 및 적절한 페이지로 리다이렉션
   * 
   * 세션 로딩 중이면 대기, 세션이 없으면 메인 페이지로 이동, 프로필 존재 여부를 체크하여 프로필 등록 페이지로 이동
   */
  useEffect(() => {
    const checkAndRedirect = async () => {
      // 세션 로딩 중이면 대기
      if (status === 'loading') return;

      // 세션이 없으면 메인 페이지로 이동
      if (!session) {
        router.push('/');
        setIsLoading(false);
        return;
      }

      try {
        // 프로필 존재 여부 확인 API 호출
        const response = await fetch('/api/profile/check');
        const data = await response.json();

        // 프로필이 없으면 프로필 등록 페이지로 이동
        if (!data.hasProfile) {
          router.push('/profile/register');
        }
      } catch (error) {
        // 프로필 확인 중 오류 발생 시 에러 로깅 및 메인 페이지로 이동
        console.error('프로필 확인 중 오류:', error);
        router.push('/');
      } finally {
        // 로딩 상태 완료
        setIsLoading(false);
      }
    };

    checkAndRedirect();
  }, [session, status, router]);

  return {
    isLoading,
  };
};
