'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { useTermsAgreement } from "@/hooks/useTermsAgreement";
import { useProfile } from "@/contexts/ProfileProvider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { isLoading, isAgreed, agreementStatus } = useTermsAgreement();

  // 모든 Hook을 먼저 호출
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 역할 기반 및 약관 동의 리다이렉션 로직
  useEffect(() => {
    // 마운트 전이거나 로딩 중일 때는 로직 처리를 건너뜀
    if (!isMounted || isLoading || isProfileLoading) return;

    const isPendingPage = pathname === '/auth/pending';
    const isProfilePage = pathname.startsWith('/profile');
    const isAuthPage = pathname.startsWith('/auth/');
    
    // 1. 역할이 NONE인 경우 처리 (가장 높은 우선순위)
    // profile이 존재하고 역할이 NONE인 경우
    if (profile?.role?.name === 'NONE') {
      // 대기 페이지와 프로필 관련 페이지는 접근 허용
      if (!isPendingPage && !isProfilePage) {
        router.replace('/auth/pending');
      }
      return;
    }

    // 2. 약관 동의가 필요한 사용자 처리
    // 이미 인증 관련 페이지에 있거나, agreementStatus가 아직 없는 경우는 제외
    if (!isAuthPage && agreementStatus && !isAgreed) {
      router.replace('/auth/terms');
    }
  }, [pathname, agreementStatus, isAgreed, profile, isLoading, isProfileLoading, isMounted, router]);

  // 인증 관련 페이지(로그인, 가입 등)나 프로필 페이지에서는 리다이렉션 로직을 건너뜀
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfilePage = pathname.startsWith('/profile');

  if (!isMounted) {
    return (
      <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <main className="overflow-y-auto min-h-0">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </main>
      </div>
    );
  }

  // 인증된 사용자가 역할을 확인 중이거나 약관 상태를 확인 중인 경우 로딩 표시
  if (!isAuthPage && (isLoading || isProfileLoading)) {
    return (
      <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <main className="overflow-y-auto min-h-0">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </main>
      </div>
    );
  }

  // NONE 역할인데 pending/profile 페이지가 아니거나, 약관 동의가 필요한데 인증 페이지가 아닌 경우 로딩 표시 (리다이렉트 대기)
  const isNoneRole = profile?.role?.name === 'NONE';
  const isPendingPage = pathname === '/auth/pending';
  const isRedirecting = (isNoneRole && !isPendingPage && !isProfilePage) || (!isAuthPage && agreementStatus && !isAgreed);

  if (isRedirecting) {
    return (
      <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <main className="overflow-y-auto min-h-0">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
      <Header />
      <main className="overflow-y-auto min-h-0">
        {children}
      </main>
    </div>
  );
}
