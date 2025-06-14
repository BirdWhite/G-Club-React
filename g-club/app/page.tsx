'use client';

import Image from "next/image";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // 로그인 상태가 아니면 체크하지 않음
    if (status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }
    
    // 로딩 중이면 체크하지 않음
    if (status === 'loading') return;
    
    // 로그인 상태이면 프로필 존재 여부 확인
    const checkProfile = async () => {
      try {
        const response = await fetch('/api/profile/check');
        const data = await response.json();
        
        // 프로필이 없으면 프로필 생성 페이지로 이동
        if (!data.hasProfile) {
          router.push('/profile/register');
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('프로필 확인 중 오류 발생:', error);
        setIsLoading(false);
      }
    };
    
    checkProfile();
  }, [session, status, router]);
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-g-background">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-g-primary"></div>
        </div>
      ) : (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              G Club에 오신 것을 환영합니다
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              더 나은 미래를 위한 첫 걸음을 시작하세요
            </p>
            <div className="space-x-4">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
                시작하기
              </button>
              <button className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors">
                더 알아보기
              </button>
            </div>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
