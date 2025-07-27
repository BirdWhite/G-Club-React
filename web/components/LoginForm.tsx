'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
    });

    if (error) {
      console.error('로그인 오류:', error);
      // 사용자에게 에러를 알리는 UI 처리 (예: toast)
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/');
      }
    };
    checkUser();
  }, [router, supabase]);

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
            <svg
              className="w-5 h-5 mr-2"
              aria-label="카카오 로고"
              role="img"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.477 2 2 5.485 2 9.993c0 2.922 2.015 5.515 5.013 7.036l-1.55 4.85-4.23-2.583C10.232 19.82 11.103 20 12 20c5.523 0 10-3.485 10-7.993C22 5.485 17.523 2 12 2z"
                fill="#181600"
              />
            </svg>
            <span className="text-black font-medium">카카오로 시작하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
