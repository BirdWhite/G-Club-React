'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserProfile, Role } from '@prisma/client';
import { useProfile } from '@/contexts/ProfileProvider';
import { isSuperAdmin } from '@/lib/database/auth';

type UserWithRole = UserProfile & { role: Role | null };

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function UserRoleManager() {
  const { profile } = useProfile();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 및 페이징 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [isTyping, setIsTyping] = useState(false);

  const isSuperAdminUser = isSuperAdmin(profile?.role);

  // Fetch users and roles from the server
  const fetchData = useCallback(async (page: number = 1, search: string = searchTerm, role: string = roleFilter, isInitialLoad: boolean = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsSearching(true);
    }
    
    try {
      // 쿼리 파라미터 구성
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(role && { role })
      });

      const [usersRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/users?${params}`),
        fetch('/api/admin/roles'),
      ]);

      if (!usersRes.ok || !rolesRes.ok) {
        throw new Error('사용자 또는 역할 정보를 불러오는데 실패했습니다.');
      }

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      // 원하는 순서대로 역할 정렬
      const roleOrder = ['NONE', 'USER', 'ADMIN', 'SUPER_ADMIN'];
      const sortedRoles = (rolesData.roles || []).sort((a: Role, b: Role) => {
        return roleOrder.indexOf(a.name) - roleOrder.indexOf(b.name);
      });

      setUsers(usersData.users || []);
      setRoles(sortedRoles);
      setPagination(usersData.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류 발생');
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsSearching(false);
      }
    }
  }, [searchTerm, roleFilter, pageSize]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchData(1, '', '', true);
  }, [fetchData]);

  // 검색어나 필터가 변경될 때 데이터 다시 로드
  useEffect(() => {
    setIsTyping(true);
    
    const timeoutId = setTimeout(() => {
      setIsTyping(false);
      setCurrentPage(1); // 검색 시 첫 페이지로 이동
      fetchData(1, searchTerm, roleFilter, false);
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, fetchData]);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      // 새 역할 정보 가져오기
      const newRole = roles.find(role => role.id === newRoleId);
      const targetUser = users.find(user => user.id === userId);
      
      // 어드민이나 슈퍼 어드민 권한을 줄 때 확인 알림
      if (newRole && (newRole.name === 'ADMIN' || newRole.name === 'SUPER_ADMIN')) {
        const roleName = newRole.name === 'ADMIN' ? '어드민' : '슈퍼 어드민';
        const userName = targetUser?.name || '알 수 없는 사용자';
        
        const confirmed = window.confirm(
          `${userName}에게 ${roleName} 권한을 주시겠습니까?\n\n해당 사용자는 관리자 권한을 갖게 됩니다.`
        );
        
        if (!confirmed) {
          return; // 사용자가 취소한 경우
        }
      }

      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: newRoleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '역할 변경에 실패했습니다.');
      }

      // 현재 페이지 데이터 다시 로드
      await fetchData(currentPage, searchTerm, roleFilter, false);
    } catch (err) {
      console.error('역할 변경 중 오류:', err);
      // 오류 발생 시 이전 상태로 되돌리기 위해 데이터 다시 로드
      await fetchData(currentPage, searchTerm, roleFilter, false);
    }
  };

  // 부원 승인/취소 함수 (NONE <-> USER)
  const handleToggleMemberStatus = async (userId: string, currentRole: string) => {
    try {
      let targetRoleId: string;
      
      if (currentRole === 'NONE') {
        // NONE -> USER (승인)
        const userRole = roles.find(role => role.name === 'USER');
        if (!userRole) {
          console.error('USER 역할을 찾을 수 없습니다.');
          return;
        }
        targetRoleId = userRole.id;
      } else {
        // USER -> NONE (승인 취소)
        const noneRole = roles.find(role => role.name === 'NONE');
        if (!noneRole) {
          console.error('NONE 역할을 찾을 수 없습니다.');
          return;
        }
        targetRoleId = noneRole.id;
      }

      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: targetRoleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '부원 상태 변경에 실패했습니다.');
      }

      // 현재 페이지 데이터 다시 로드
      await fetchData(currentPage, searchTerm, roleFilter, false);
    } catch (err) {
      console.error('부원 상태 변경 중 오류:', err);
      // 오류 발생 시 이전 상태로 되돌리기 위해 데이터 다시 로드
      await fetchData(currentPage, searchTerm, roleFilter, false);
    }
  };

  // 역할 변경이 가능한지 확인하는 함수
  const canChangeRole = (targetUser: UserWithRole) => {
    if (!profile) return false;
    
    // 슈퍼 관리자는 모든 사용자의 역할을 변경할 수 있음 (자신도 포함)
    if (isSuperAdminUser) return true;
    
    // 자기 자신의 역할은 변경할 수 없음 (슈퍼 관리자 제외)
    if (targetUser.userId === profile.userId) return false;
    
    // 일반 관리자는 슈퍼 관리자나 다른 관리자의 역할을 변경할 수 없음
    if (targetUser.role?.name === 'SUPER_ADMIN' || targetUser.role?.name === 'ADMIN') return false;
    
    return true;
  };

  // 페이지네이션 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 즉시 데이터 로드
    fetchData(page, searchTerm, roleFilter, false);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchData(1, searchTerm, roleFilter, false);
  };

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">오류: {error}</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">사용자 관리</h2>
      
      {/* 검색 및 필터 섹션 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 검색 입력 */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              사용자 검색
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이름 또는 Supabase UID로 검색..."
                className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 ${
                  isTyping ? 'bg-yellow-50 border-yellow-300' : 
                  isSearching ? 'bg-blue-50 border-blue-300' : ''
                }`}
              />
              {isTyping && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              )}
              {isSearching && !isTyping && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
          </div>
          
          {/* 역할 필터 */}
          <div className="sm:w-48">
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
              역할 필터
            </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="">모든 역할</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 페이지 크기 선택 */}
          <div className="sm:w-32">
            <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700 mb-1">
              페이지 크기
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>
        </div>
        
        {/* 검색 결과 정보 */}
        {pagination && (
          <div className="text-sm text-gray-600">
            총 {pagination.totalCount}명 중 {((pagination.currentPage - 1) * pagination.limit) + 1}-{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}명 표시
          </div>
        )}
      </div>

      <div className="relative">
        {/* 검색 중 로딩 오버레이 (타이핑 중이 아닐 때만) */}
        {isSearching && !isTyping && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="text-sm text-gray-600">검색 중...</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자 이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supabase UID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">부원 확인</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">현재 역할</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할 변경</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const canModify = canChangeRole(user);
              return (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.userId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(!user.roleId || user.role?.name === 'NONE') ? (
                      <button
                        onClick={() => handleToggleMemberStatus(user.id, 'NONE')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        승인
                      </button>
                    ) : user.role?.name === 'USER' ? (
                      <div className="group relative">
                        <button
                          onClick={() => handleToggleMemberStatus(user.id, 'USER')}
                          className="inline-flex items-center justify-center w-20 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 bg-green-100 text-green-800 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg className="w-3 h-3 mr-1 group-hover:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <svg className="w-3 h-3 mr-1 hidden group-hover:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="group-hover:hidden">승인됨</span>
                          <span className="hidden group-hover:inline">취소</span>
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-md">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        승인됨
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                      user.role?.name === 'USER' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role?.name || (user.roleId ? '없음' : '검증 대기')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {canModify ? (
                      <select
                        value={user.roleId || ''}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
                      >
                        {roles
                          .filter(role => role.name !== 'SUPER_ADMIN' || isSuperAdminUser) // 슈퍼 관리자 역할은 슈퍼 관리자만 할당 가능
                          .map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-900">변경 불가</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* 페이징 UI */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{pagination.totalCount}</span>명 중{' '}
                <span className="font-medium">{((pagination.currentPage - 1) * pagination.limit) + 1}</span>
                -
                <span className="font-medium">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}</span>
                명 표시
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">이전</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* 페이지 번호들 */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === currentPage
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">다음</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
