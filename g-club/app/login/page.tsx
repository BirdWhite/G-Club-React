'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      // 여기서 DB(또는 API)에서 유저 프로필 데이터가 있는지 체크
      fetch('/api/profile/check')
        .then(res => res.json())
        .then(data => {
          if (data.hasProfile) {
            router.push('/');
          } else {
            router.push('/profile/register');
          }
        });
    }
  }, [session, router]);

  if (session) {
    // 로딩 중에는 아무것도 렌더링하지 않음
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-g-background">
      <div className="max-w-md w-full p-profile-padding bg-white rounded-profile shadow-profile text-center">
        <h1 className="text-2xl font-bold mb-profile-margin text-g-text">G-Club 로그인</h1>
        <button 
          onClick={() => signIn("kakao")} 
          className="px-6 py-3 bg-yellow-400 text-gray-800 font-medium rounded-profile hover:bg-yellow-500 transition-colors shadow-profile w-full"
        >
          카카오로 로그인
        </button>
      </div>
    </div>
  );
}
