'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, Role } from '@prisma/client';
import { useProfile } from '@/contexts/ProfileProvider';
import { isSuperAdmin } from '@/lib/auth/roles';

type UserWithRole = UserProfile & { role: Role | null };

export default function UserRoleManager() {
  const { profile } = useProfile();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdminUser = isSuperAdmin(profile?.role);

  // Fetch all users and roles from the server
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetch('/api/admin/users'),
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
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류 발생');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: newRoleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '역할 변경에 실패했습니다.');
      }

      // Update the local state to reflect the change
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, roleId: newRoleId, role: roles.find(r => r.id === newRoleId) || null } 
          : user
      ));
      alert('사용자 역할이 성공적으로 변경되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '역할 변경 중 오류 발생');
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

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">오류: {error}</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">사용자 역할 관리</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자 이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supabase UID</th>
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                      user.role?.name === 'USER' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role?.name || '없음'}
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
  );
}
