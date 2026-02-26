'use client';

import { useState, useEffect } from 'react';
import type { Role, Permission } from '@prisma/client';
import { useProfile } from '@/contexts/ProfileProvider';
import { isSuperAdmin } from '@/lib/database/auth';

type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export function PermissionManager() {
  const { profile } = useProfile();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdminUser = isSuperAdmin(profile?.role);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rolesRes, permissionsRes] = await Promise.all([
          fetch('/api/admin/roles'),
          fetch('/api/admin/permissions'),
        ]);

        if (!rolesRes.ok || !permissionsRes.ok) {
          throw new Error('역할 또는 권한 정보를 불러오는데 실패했습니다.');
        }

        const rolesData = await rolesRes.json();
        const permissionsData = await permissionsRes.json();
        
        // 권한 목록을 이름 순으로 정렬
        const sortedPermissions = permissionsData.permissions.sort((a: Permission, b: Permission) => 
          a.name.localeCompare(b.name)
        );
        
        setRoles(rolesData.roles || []);
        setPermissions(sortedPermissions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류 발생');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePermissionToggle = async (roleId: string, permissionId: string, currentlyHasPermission: boolean) => {
    if (!isSuperAdminUser) {
      alert('권한 변경은 슈퍼 관리자만 가능합니다.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionId,
          action: currentlyHasPermission ? 'remove' : 'add'
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '권한 변경에 실패했습니다.');
      }

      // 로컬 상태 업데이트
      setRoles(roles.map(role => {
        if (role.id !== roleId) return role;

        const updatedPermissions = currentlyHasPermission
          ? role.permissions.filter(p => p.id !== permissionId)
          : [...role.permissions, permissions.find(p => p.id === permissionId)!];

        return {
          ...role,
          permissions: updatedPermissions,
        };
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '권한 변경 중 오류 발생');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-admin-foreground">로딩 중...</div>;
  if (error) return <div className="text-danger">오류: {error}</div>;

  return (
    <div className="bg-admin-50 shadow rounded-lg p-6 border border-admin-border">
      <h2 className="text-2xl font-bold mb-4 text-admin-foreground">권한 관리</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-admin-border">
          <thead className="bg-admin-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-foreground uppercase">권한 \ 역할</th>
              {roles.map(role => (
                <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-admin-foreground uppercase">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-admin-50 divide-y divide-admin-border">
            {permissions.map(permission => (
              <tr key={permission.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-admin-foreground">{permission.name}</div>
                  {permission.description && (
                    <div className="text-xs text-admin-foreground">{permission.description}</div>
                  )}
                </td>
                {roles.map(role => {
                  const hasPermission = role.permissions.some(p => p.id === permission.id);
                  const isDisabled = !isSuperAdminUser || role.name === 'SUPER_ADMIN';
                  
                  return (
                    <td key={role.id} className="px-6 py-4 text-center">
                      <button
                        onClick={() => handlePermissionToggle(role.id, permission.id, hasPermission)}
                        disabled={isDisabled || isSaving}
                        className={`w-8 h-8 rounded-full font-bold ${
                          hasPermission
                            ? 'bg-admin-100 text-admin-foreground hover:bg-admin-200'
                            : 'bg-danger/20 text-danger hover:bg-danger/30'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {hasPermission ? 'O' : 'X'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
