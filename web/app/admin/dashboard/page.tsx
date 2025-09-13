'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserRoleManager from './UserRoleManager';
import PermissionManager from './PermissionManager';
import GameManager from './GameManager';
import { useSearchParams } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import { isAdmin } from '@/lib/auth/roles'; // isAdmin 함수 임포트

export default function AdminDashboard() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  }, [profile, isLoading, hasAdminAccess, router]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab as any);
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
    <div className="h-full bg-gray-100 p-4 overflow-y-auto scrollbar-visible">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>
          
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('user')}
                className={`${tab === 'user' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                사용자 관리
              </button>
              <button
                onClick={() => handleTabChange('permission')}
                className={`${tab === 'permission' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                권한 관리
              </button>
              <button
                onClick={() => handleTabChange('games')}
                className={`${tab === 'games' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                게임 관리
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {tab === 'user' && <UserRoleManager />}
            {tab === 'permission' && <PermissionManager />}
            {tab === 'games' && <GameManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
