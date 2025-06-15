'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserRoleManager from './UserRoleManager';
import PermissionManager from './PermissionManager';
import BoardManager from './BoardManager';

export default function AdminDashboard() {
  const { isAuthenticated, isAdmin, isLoading, userRole, roleName } = useAuth();
  const router = useRouter();
  // 탭 상태 관리 - 최상단에서 선언
  const [tab, setTab] = useState<'user' | 'permission' | 'board'>('user');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin())) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>
          {/* 탭 메뉴 */}
          <div className="flex space-x-2 mb-6">
            <button
              className={`px-4 py-2 rounded-t ${tab === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setTab('user')}
            >
              사용자 권한 관리
            </button>
            <button
              className={`px-4 py-2 rounded-t ${tab === 'permission' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setTab('permission')}
            >
              역할별 권한 관리
            </button>
            <button
              className={`px-4 py-2 rounded-t ${tab === 'board' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setTab('board')}
            >
              게시판 관리
            </button>
          </div>
          {/* 탭 내용 */}
          {tab === 'user' && <UserRoleManager />}
          {tab === 'permission' && <PermissionManager />}
          {tab === 'board' && <BoardManager />}
        </div>
      </div>
    </div>
  );
}
