'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import { isAdmin } from '@/lib/database/auth';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileAdminDashboard } from '@/components/mobile/MobileAdminDashboard';
import { DesktopAdminDashboard } from '@/components/desktop/DesktopAdminDashboard';

export default function AdminDashboard() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  // URL의 쿼리 파라미터에서 탭 상태 가져오기
  const getInitialTab = () => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'permission') return 'permission';
    if (tabParam === 'games') return 'games';
    return 'user';
  };
  
  const [tab, setTab] = useState<'user' | 'permission' | 'games'>(getInitialTab);

  const hasAdminAccess = isAdmin(profile?.role); // isAdmin 함수 사용

  useEffect(() => {
    if (!isLoading && !hasAdminAccess) {
      router.push('/');
    }
  }, [profile, isLoading, hasAdminAccess, router]); // router 의존성 복구

  const handleTabChange = (newTab: string) => {
    setTab(newTab as 'user' | 'permission' | 'games');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <MobileAdminDashboard initialTab={tab} onTabChange={handleTabChange} />
      ) : (
        <DesktopAdminDashboard initialTab={tab} onTabChange={handleTabChange} />
      )}
    </>
  );
}
