"use client";
import { useState, useEffect } from "react";
import { ROLE_NAMES, BOARD_PERMISSION_LABELS, UserRole, BoardPermission, type BoardPermissionMap } from "@/lib/auth/roles";
import type { Board } from "@/types/models";

export default function BoardManager() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardPermissionMap, setBoardPermissionMap] = useState<BoardPermissionMap>({} as BoardPermissionMap);
  const [isLoading, setIsLoading] = useState(true);
  const [newBoard, setNewBoard] = useState({ name: "", slug: "", description: "" });
  const [activeTab, setActiveTab] = useState<'list' | 'permissions'>('list');

  // 게시판 목록과 권한 설정 불러오기
  const loadBoardsAndPermissions = async () => {
    try {
      setIsLoading(true);
      
      // 게시판 목록 불러오기
      const boardsRes = await fetch("/api/admin/boards");
      const boardsData = await boardsRes.json();
      
      // 게시판 권한 설정 불러오기
      const permissionsRes = await fetch("/api/admin/board-permissions");
      const permissionsData = await permissionsRes.json();
      
      setBoards(boardsData.boards || []);
      setBoardPermissionMap(permissionsData.boardPermissionMap || {});
    } catch (error) {
      console.error("게시판 데이터 로딩 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBoardsAndPermissions();
  }, []);

  // 새 게시판 추가
  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBoard),
      });
      
      if (res.ok) {
        setNewBoard({ name: "", slug: "", description: "" });
        loadBoardsAndPermissions(); // 목록 새로고침
      } else {
        const error = await res.json();
        alert(`오류: ${error.message || "게시판 추가 실패"}`);
      }
    } catch (error) {
      console.error("게시판 추가 오류:", error);
    }
  };

  // 게시판 삭제
  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm("정말 이 게시판을 삭제하시겠습니까? 모든 게시글이 함께 삭제됩니다.")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/boards/${boardId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        loadBoardsAndPermissions(); // 목록 새로고침
      } else {
        const error = await res.json();
        alert(`오류: ${error.message || "게시판 삭제 실패"}`);
      }
    } catch (error) {
      console.error("게시판 삭제 오류:", error);
    }
  };

  const toggleRecruitment = async (boardId: string) => {
    try {
      const response = await fetch(`/api/admin/boards/${boardId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('게시판 상태 변경에 실패했습니다.');
      }

      const updatedBoard = await response.json();
      setBoards(boards.map(board => 
        board.id === updatedBoard.id ? updatedBoard : board
      ));
      
      // toast.success('게시판 상태가 변경되었습니다.');
    } catch (error) {
      console.error('게시판 상태 변경 오류:', error);
      // toast.error('게시판 상태를 변경하는 중 오류가 발생했습니다.');
    }
  };

  // 게시판 권한 토글
  const handlePermissionToggle = (boardSlug: string, role: UserRole, permission: keyof BoardPermission) => {
    setBoardPermissionMap((prev: BoardPermissionMap) => {
      // 해당 게시판 권한이 없으면 기본값으로 초기화
      const currentBoardPerms = prev[boardSlug] || {
        [UserRole.NONE]: { canRead: false, canWrite: false, canModerate: false },
        [UserRole.USER]: { canRead: true, canWrite: true, canModerate: false },
        [UserRole.ADMIN]: { canRead: true, canWrite: true, canModerate: true },
        [UserRole.SUPER_ADMIN]: { canRead: true, canWrite: true, canModerate: true }
      };
      
      // 현재 역할의 권한이 없으면 기본값으로 초기화
      const currentRolePerms = currentBoardPerms[role] || { canRead: false, canWrite: false, canModerate: false };
      
      // 권한 토글
      const updatedPerms = {
        ...currentBoardPerms,
        [role]: {
          ...currentRolePerms,
          [permission]: !currentRolePerms[permission]
        }
      };
      
      return {
        ...prev,
        [boardSlug]: updatedPerms
      };
    });
  };

  // 게시판 권한 저장
  const savePermissions = async () => {
    try {
      const res = await fetch("/api/admin/board-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardPermissionMap }),
      });
      
      if (res.ok) {
        alert("게시판 권한이 저장되었습니다.");
        loadBoardsAndPermissions(); // 권한 새로고침
      } else {
        const error = await res.json();
        alert(`오류: ${error.message || "권한 저장 실패"}`);
      }
    } catch (error) {
      console.error("권한 저장 오류:", error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">게시판 관리</h2>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${activeTab === 'list' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            게시판 목록
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'permissions' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            게시판 권한
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="p-4 text-center">로딩 중...</div>
      ) : activeTab === 'list' ? (
        <div>
          {/* 게시판 추가 폼 */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <h3 className="text-lg font-medium mb-4">새 게시판 추가</h3>
            <form onSubmit={handleAddBoard} className="space-y-4">
              <div>
                <label className="block mb-1">게시판 이름</label>
                <input
                  type="text"
                  value={newBoard.name}
                  onChange={(e) => setNewBoard({...newBoard, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">슬러그 (URL 식별자)</label>
                <input
                  type="text"
                  value={newBoard.slug}
                  onChange={(e) => setNewBoard({...newBoard, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                  className="w-full p-2 border rounded"
                  pattern="[a-z0-9-]+"
                  title="소문자, 숫자, 하이픈만 사용 가능합니다"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">예: notice, free-board (소문자, 숫자, 하이픈만 사용)</p>
              </div>
              <div>
                <label className="block mb-1">설명 (선택사항)</label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({...newBoard, description: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                게시판 추가
              </button>
            </form>
          </div>
          
          {/* 게시판 목록 */}
          <div className="bg-white rounded shadow">
            <h3 className="text-lg font-medium p-4 border-b">게시판 목록</h3>
            {boards.length === 0 ? (
              <p className="p-4 text-center text-gray-500">등록된 게시판이 없습니다.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">이름</th>
                    <th className="p-2 text-left">슬러그</th>
                    <th className="p-2 text-left">설명</th>
                    <th className="p-2 text-center">상태</th>
                    <th className="p-2 text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((board) => (
                    <tr key={board.id} className="border-t">
                      <td className="p-2">{board.name}</td>
                      <td className="p-2">{board.slug}</td>
                      <td className="p-2">{board.description || '-'}</td>
                      <td className="p-2 text-center">
                        {board.isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">활성</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">비활성</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteBoard(board.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* 게시판 권한 설정 */}
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-medium mb-4">게시판별 권한 설정</h3>
            
            {boards.length === 0 ? (
              <p className="text-center text-gray-500">등록된 게시판이 없습니다.</p>
            ) : (
              <>
                {boards.map((board) => (
                  <div key={board.id} className="mb-6 border-b pb-4">
                    <h4 className="font-medium mb-2">{board.name} ({board.slug})</h4>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2">권한</th>
                          {Object.values(UserRole).map((role) => (
                            <th key={role} className="p-2 text-center">{ROLE_NAMES[role]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(BOARD_PERMISSION_LABELS).map((permission) => (
                          <tr key={permission} className="border-t">
                            <td className="p-2 font-medium">
                              {BOARD_PERMISSION_LABELS[permission as keyof BoardPermission]}
                            </td>
                            {Object.values(UserRole).map((role) => {
                              const roleAsUserRole = role as UserRole;
                              // 해당 게시판의 권한 설정이 없으면 기본값 사용
                              const hasPermission = boardPermissionMap[board.slug]?.[roleAsUserRole]?.[permission as keyof BoardPermission] ?? 
                                (roleAsUserRole === UserRole.SUPER_ADMIN || 
                                 (roleAsUserRole === UserRole.ADMIN && permission !== 'canModerate') || 
                                 (roleAsUserRole === UserRole.USER && permission === 'canRead'));
                              
                              return (
                                <td key={role} className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={() => handlePermissionToggle(
                                      board.slug, 
                                      roleAsUserRole, 
                                      permission as keyof BoardPermission
                                    )}
                                    className="accent-blue-500"
                                    disabled={roleAsUserRole === UserRole.SUPER_ADMIN} // 슈퍼관리자는 항상 모든 권한
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={savePermissions}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    권한 저장
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
