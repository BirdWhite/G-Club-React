import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

/**
 * 로그인 훅
 * 
 * 세션 상태를 확인하고, 프로필 존재 여부에 따라 메인 페이지 또는 프로필 등록 페이지로 이동
 * 
 * @returns {object} 로그인 관련 데이터와 함수
 */
export const useLogin = () => {
  // 세션 데이터와 상태
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 프로필 확인 중 여부 상태
  const [isChecking, setIsChecking] = useState(true);

  /**
   * 세션 상태 변화 감지 및 프로필 확인 로직
   * 
   * 세션 로딩 중이면 대기, 세션이 있는 경우 프로필 존재 여부 확인
   */
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      // 세션 로딩 중이면 대기
      if (status === 'loading') return;
      
      // 세션이 있는 경우 프로필 존재 여부 확인
      if (session) {
        try {
          // 프로필 확인 API 호출
          const response = await fetch('/api/profile/check');
          const data = await response.json();
          
          // 프로필이 있으면 메인 페이지로, 없으면 프로필 등록 페이지로 이동
          if (data.hasProfile) {
            router.push('/');
          } else {
            router.push('/profile/register');
          }
        } catch (error) {
          // 프로필 확인 중 오류 발생 시 에러 로깅
          console.error('프로필 확인 중 오류:', error);
        }
      }
      
      // 프로필 확인 완료
      setIsChecking(false);
    };

    checkProfileAndRedirect();
  }, [session, status, router]);

  /**
   * 카카오 로그인 함수
   * 
   * 카카오 로그인 API 호출
   */
  const handleKakaoLogin = () => {
    signIn('kakao');
  };

  return {
    session,
    isChecking,
    handleKakaoLogin,
  };
};
