"use client";
import { useState, useEffect } from "react";
import { UserRole, ROLE_NAMES, ROLE_PERMISSIONS, Permission } from "@/lib/auth/roles";

const permissionLabels: Record<keyof Permission, string> = {
  canViewPosts: "게시글 조회",
  canCreatePosts: "게시글 작성",
  canEditOwnPosts: "내 게시글 수정",
  canDeleteOwnPosts: "내 게시글 삭제",
  canEditAllPosts: "전체 게시글 수정",
  canDeleteAllPosts: "전체 게시글 삭제",
  canViewUserList: "사용자 목록 조회",
  canManageUsers: "사용자 관리",
  canChangeUserRoles: "사용자 권한 변경",
  canAccessAdminPanel: "관리자 대시보드 접근",
  canManageAdmins: "관리자 관리",
};

export default function PermissionManager() {
  const [permissions, setPermissions] = useState(ROLE_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  // 서버에서 권한 설정 불러오기
  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/permissions");
      const data = await res.json();
      
      // 서버에 저장된 권한이 있으면 사용, 없으면 기본값 유지
      if (data.permissions) {
        setPermissions(data.permissions);
      }
    } catch (err) {
      console.error("권한 정보 로딩 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 권한 설정 불러오기
  useEffect(() => {
    loadPermissions();
  }, []);

  const handleToggle = (role: UserRole, key: keyof Permission) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: !prev[role][key] },
    }));
  };

  // 권한 저장 함수
  const savePermissions = async () => {
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("권한이 성공적으로 저장되었습니다.");
        // 저장 후 최신 데이터 다시 불러오기
        await loadPermissions();
      } else {
        alert(data.error || "저장에 실패했습니다.");
      }
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">역할별 권한 관리</h2>
      
      {isLoading ? (
        <div className="mt-4 text-gray-500">권한 정보 로딩 중...</div>
      ) : (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={savePermissions}
        >
          저장
        </button>
      )}
      
      <div className="overflow-x-auto mt-4">
        {isLoading ? (
          <div className="p-4 text-center">로딩 중...</div>
        ) : (
          <table className="min-w-max bg-white rounded shadow">
            <thead>
              <tr>
                <th className="p-2">권한 항목</th>
                {Object.values(UserRole).map((role) => (
                  <th className="p-2" key={role}>{ROLE_NAMES[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(permissionLabels).map((key) => (
                <tr key={key}>
                  <td className="p-2 font-medium">{permissionLabels[key as keyof Permission]}</td>
                  {Object.values(UserRole).map((role) => (
                    <td className="p-2 text-center" key={role}>
                      <input
                        type="checkbox"
                        checked={permissions[role][key as keyof Permission]}
                        onChange={() => handleToggle(role as UserRole, key as keyof Permission)}
                        className="accent-blue-500"
                        disabled={role === "SUPER_ADMIN"}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="mt-4 text-gray-500 text-sm">※ SUPER_ADMIN 권한은 항상 모든 권한이 활성화되어 있습니다.</div>
    </div>
  );
}
