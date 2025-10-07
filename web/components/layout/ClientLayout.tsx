'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { useTermsAgreement } from "@/hooks/useTermsAgreement";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAgreed, agreementStatus } = useTermsAgreement();

  // 모든 Hook을 먼저 호출
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 약관 동의 상태가 확인되었고 동의하지 않은 경우 약관 동의 페이지로 리다이렉트
  useEffect(() => {
    const isAuthPage = pathname.startsWith('/auth/');
    if (!isAuthPage && agreementStatus && !isAgreed) {
      router.replace('/auth/terms');
    }
  }, [pathname, agreementStatus, isAgreed, router]);

  // 약관 동의 페이지나 인증 관련 페이지에서는 약관 동의 상태 확인을 건너뜀
  const isAuthPage = pathname.startsWith('/auth/');

  if (!isMounted) {
    return (
      <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <main className="overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </main>
      </div>
    );
  }

  // 인증된 사용자가 약관에 동의하지 않은 경우 로딩 표시
  if (!isAuthPage && isLoading) {
    return (
      <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <main className="overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthPage && agreementStatus && !isAgreed) {
    return (
      <div className="h-screen grid grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <main className="overflow-y-auto">
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
      <main className="overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
