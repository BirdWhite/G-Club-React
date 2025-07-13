'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleKakaoLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('로그인 오류:', error);
    }
  };

  // 로그인 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.push('/');
        }
      } catch (error) {
        console.error('사용자 확인 중 오류 발생:', error);
      }
    };
    
    checkUser();
    
    // 페이지 가시성 변경 시 사용자 확인
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUser();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            G-Club에 로그인
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            카카오 계정으로 간편하게 시작하세요
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={handleKakaoLogin}
            className="w-full flex justify-center items-center py-3 px-4 rounded-md bg-[#FEE500] hover:bg-[#FEE500]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-colors"
          >
            <span className="mr-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3C6.48 3 2 6.03 2 9.75C2 12.3 4.2 14.47 7.27 15.63L5.81 19.5L9.54 17.19C10.2 17.37 10.89 17.5 11.6 17.5C16.04 17.5 20 14.9 20 11.75C20 8.6 16.04 6 11.6 6H12V3Z" fill="#000000"/>
              </svg>
            </span>
            <span className="text-black font-medium">카카오로 시작하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
