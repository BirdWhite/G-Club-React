'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, PhotoIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import type { Game } from '@/types/models';

export function GameManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [formData, setFormData] = useState<Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'gamePosts' | 'favoritedBy'>>({
    name: '',
    description: '',
    iconUrl: '',
    aliases: []
  });
  const [aliasesInput, setAliasesInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 미리보기 URL이 변경될 때 이전 URL을 해제하여 메모리 누수 방지
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('게임 목록을 불러오는데 실패했습니다.');
      const data = await res.json();
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('게임 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('게임 이름을 입력해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      let finalIconUrl = editingGame?.iconUrl || '';

      // 새 파일이 선택된 경우에만 업로드 실행
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('uploadType', 'gameIcon');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('아이콘 이미지 업로드에 실패했습니다.');
        }
        const { url } = await uploadResponse.json();
        finalIconUrl = url;
      }

      const url = editingGame ? `/api/games/${editingGame.id}` : '/api/games';
      const method = editingGame ? 'PUT' : 'POST';
      
      const gameData = { 
        ...formData,
        iconUrl: finalIconUrl,
        aliases: aliasesInput.split(',').map(a => a.trim().toLowerCase()).filter(a => a.length > 0)
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(gameData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || (editingGame ? '게임 수정에 실패했습니다.' : '게임 추가에 실패했습니다.'));
      }

      toast.success(editingGame ? '게임이 수정되었습니다.' : '게임이 추가되었습니다.');
      fetchGames();
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 이 게임을 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('게임 삭제에 실패했습니다.');
      
      toast.success('게임이 삭제되었습니다.');
      fetchGames();
    } catch {
      toast.error('게임 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (game: Game) => {
    console.log('Editing game:', game); // 디버깅용 로그 추가
    setEditingGame(game);
    
    setFormData({
      ...game,
      iconUrl: game.iconUrl || '', // null이면 빈 문자열로 설정
      aliases: game.aliases || [] // undefined면 빈 배열로 설정
    });
    setAliasesInput(game.aliases?.join(', ') || '');
    setPreviewUrl(null); // 수정 시작 시 미리보기 초기화
    setSelectedFile(null); // 수정 시작 시 선택 파일 초기화
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      iconUrl: '',
      aliases: []
    });
    setAliasesInput('');
    setEditingGame(null);
    setIsAdding(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // 기존 미리보기 URL 해제
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    // 새 미리보기 URL 생성
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleReorder = async (gameId: string, direction: 'up' | 'down') => {
    setReordering(gameId);
    
    try {
      const response = await fetch('/api/games/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ gameId, direction })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '게임 순서 변경에 실패했습니다.');
      }

      toast.success('게임 순서가 변경되었습니다.');
      fetchGames(); // 목록 새로고침
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '게임 순서 변경 중 오류가 발생했습니다.');
    } finally {
      setReordering(null);
    }
  };

  if (loading) return <div className="text-admin-foreground">로딩 중...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg text-admin-foreground font-medium">게임 관리</h2>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-admin-primary hover:bg-admin-500/90"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          게임 추가
        </button>
      </div>

      <div className="bg-admin-50 shadow overflow-x-auto sm:rounded-lg border border-admin-border">
        <table className="min-w-full divide-y divide-admin-border">
          <thead className="bg-admin-100">
            <tr>
              <th className="w-14 px-2 py-3 text-left text-xs font-medium text-admin-foreground uppercase tracking-wider">순서</th>
              <th className="w-16 px-2 py-3 text-left text-xs font-medium text-admin-foreground uppercase tracking-wider">아이콘</th>
              <th className="w-28 px-3 py-3 text-left text-xs font-medium text-admin-foreground uppercase tracking-wider">이름</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-admin-foreground uppercase tracking-wider">설명</th>
              <th className="w-24 px-3 py-3 text-left text-xs font-medium text-admin-foreground uppercase tracking-wider">생성일</th>
              <th className="w-24 px-3 py-3 text-right text-xs font-medium text-admin-foreground uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody className="bg-admin-50 divide-y divide-admin-border">
            {games.map((game, index) => (
              <tr key={game.id} className="hover:bg-admin-100">
                <td className="w-14 px-2 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleReorder(game.id, 'up')}
                      disabled={index === 0 || reordering === game.id}
                      className="text-admin-foreground hover:text-admin-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(game.id, 'down')}
                      disabled={index === games.length - 1 || reordering === game.id}
                      className="text-admin-foreground hover:text-admin-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="w-16 px-2 py-4 whitespace-nowrap">
                  {game.iconUrl && (
                    <Image className="h-10 w-10 rounded-full" src={game.iconUrl} alt={game.name} width={40} height={40} />
                  )}
                </td>
                <td className="w-28 px-3 py-4 whitespace-nowrap text-sm font-medium text-admin-foreground">{game.name}</td>
                <td className="px-4 py-4 text-sm text-admin-foreground">{game.description}</td>
                <td className="w-24 px-3 py-4 whitespace-nowrap text-sm text-admin-foreground">
                  {new Date(game.createdAt).toLocaleDateString()}
                </td>
                <td className="w-24 px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(game)}
                    className="text-admin-primary hover:text-admin-500 mr-4"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-danger hover:text-danger/90"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 모달 */}
      {(isAdding || editingGame) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-admin-50 rounded-lg p-6 w-full max-w-md border border-admin-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg text-admin-foreground font-medium">
                {editingGame ? '게임 수정' : '새 게임 추가'}
              </h3>
              <button
                onClick={resetForm}
                className="text-admin-foreground hover:text-admin-primary"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-foreground">아이콘</label>
                <div className="mt-1 flex items-center">
                  <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-admin-100">
                    {previewUrl ? (
                      <Image src={previewUrl} alt="미리보기" className="h-full w-full object-cover" width={48} height={48} />
                    ) : formData.iconUrl ? (
                      <Image src={formData.iconUrl} alt={formData.name} className="h-full w-full object-cover" width={48} height={48} />
                    ) : (
                      <PhotoIcon className="h-full w-full text-admin-border" />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-5 bg-admin-50 py-2 px-3 border border-admin-border rounded-md shadow-sm text-sm leading-4 font-medium text-admin-foreground hover:bg-admin-100 focus:outline-none"
                  >
                    이미지 선택
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-foreground">게임 이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full text-admin-foreground border border-admin-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-admin-primary focus:border-admin-primary sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-foreground">게임 별칭</label>
                <input
                  type="text"
                  name="aliases"
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value)}
                  className="mt-1 block w-full text-admin-foreground border border-admin-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-admin-primary focus:border-admin-primary sm:text-sm"
                  placeholder="쉼표(,)로 구분하여 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-foreground">설명</label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full text-admin-foreground border border-admin-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-admin-primary focus:border-admin-primary sm:text-sm"
                />
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-admin-50 py-2 px-4 border border-admin-border rounded-md shadow-sm text-sm font-medium text-admin-foreground hover:bg-admin-100"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-admin-primary hover:bg-admin-500/90 disabled:opacity-50"
                  >
                    {isUploading ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
