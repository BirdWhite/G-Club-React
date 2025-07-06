"use client";
import { useEffect, useState } from "react";
import { UserRole, ROLE_NAMES } from "@/lib/auth/roles";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  profile?: {
    fullname?: string;
  };
}

export default function UserRoleManager() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editRoles, setEditRoles] = useState<Record<string, UserRole>>({});

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setLoading(false);
      })
      .catch((err) => {
        setError("사용자 목록을 불러오지 못했습니다.");
        setLoading(false);
      });
  }, []);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setEditRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole: editRoles[userId] }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: editRoles[userId] } : u))
      );
    } catch {
      setError("권한 변경에 실패했습니다.");
    }
    setSaving(false);
  };

  if (loading) return <div>사용자 목록 로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">사용자 권한 관리</h2>
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th className="p-2">사용자 ID</th>
            <th className="p-2">이름</th>
            <th className="p-2">현재 역할</th>
            <th className="p-2">역할 변경</th>
            <th className="p-2">저장</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = session?.user?.id === user.id;
            const isSuperAdmin = user.role === "SUPER_ADMIN";
            const selectDisabled = isSuperAdmin && !isSelf;
            const selectedRole = editRoles[user.id] ?? "USER";
            const saveDisabled = selectDisabled || selectedRole === user.role || saving;
            return (
              <tr key={user.id}>
                <td className="p-2">{user.id}</td>
                <td className="p-2 text-center">{user.name || "-"}</td>
                <td className="p-2 text-center">{ROLE_NAMES[user.role]}</td>
                <td className="p-2 text-center">
                  <select
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={selectDisabled}
                    className={
                      "border rounded px-2 py-1" +
                      (selectDisabled ? " bg-gray-200 text-gray-400 cursor-not-allowed" : "")
                    }
                  >
                    <option value="NONE">역할 없음</option>
                    <option value="USER">일반 유저</option>
                    <option value="ADMIN">관리자</option>
                  </select>
                </td>
                <td className="p-2 text-center">
                  <button
                    className={
                      "px-3 py-1 rounded " +
                      (saveDisabled
                        ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600")
                    }
                    disabled={saveDisabled}
                    onClick={() => handleSave(user.id)}
                  >
                    저장
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
