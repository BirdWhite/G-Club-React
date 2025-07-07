'use client';

import { useState, useEffect, useRef } from 'react';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import type { Game } from '@/types/models';

export default function GameManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [formData, setFormData] = useState<Omit<Game, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    iconUrl: '', // null 대신 빈 문자열로 초기화
    aliases: [] // 문자열 배열로 관리
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const url = editingGame ? `/api/games/${editingGame.id}` : '/api/games';
      const method = editingGame ? 'PUT' : 'POST';
      
      const gameData = { ...formData };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(gameData)
      });

      if (!response.ok) throw new Error(editingGame ? '게임 수정에 실패했습니다.' : '게임 추가에 실패했습니다.');

      toast.success(editingGame ? '게임이 수정되었습니다.' : '게임이 추가되었습니다.');
      fetchGames();
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
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
    } catch (err) {
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
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      iconUrl: '',
      aliases: []
    });
    setEditingGame(null);
    setIsAdding(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('isTemporary', 'false');

    setIsUploading(true);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('이미지 업로드에 실패했습니다.');

      const { url } = await response.json();
      setFormData(prev => ({ ...prev, iconUrl: url }));
    } catch (err) {
      toast.error('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">게임 관리</h2>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          게임 추가
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">아이콘</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생성일</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {games.map((game) => (
              <tr key={game.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {game.iconUrl && (
                    <img className="h-10 w-10 rounded-full" src={game.iconUrl} alt={game.name} />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{game.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{game.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(game.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(game)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-red-600 hover:text-red-900"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingGame ? '게임 수정' : '새 게임 추가'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">게임 이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">게임 별칭</label>
                <input
                  type="text"
                  name="aliases"
                  value={formData.aliases?.join(', ') || ''}
                  onChange={(e) => {
                    const aliases = e.target.value
                      .split(',')
                      .map(a => a.trim())
                      .filter(a => a.length > 0);
                    setFormData(prev => ({
                      ...prev,
                      aliases
                    }));
                  }}
                  placeholder="쉼표로 구분된 별칭 (예: 리그 오브 레전드, 롤, lol)"
                  className="w-full p-2 border rounded"
                />
                <p className="mt-1 text-xs text-gray-500">게임의 다른 이름을 쉼표로 구분하여 입력하세요.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">아이콘</label>
                <div className="mt-1 flex items-center">
                  {formData.iconUrl ? (
                    <div className="relative">
                      <img
                        src={formData.iconUrl || ''}
                        alt="미리보기"
                        className="h-16 w-16 rounded-full object-cover"
                        onError={(e) => {
                          // 이미지 로드 실패 시 빈 이미지로 대체
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                          target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, iconUrl: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center h-16 w-16 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400"
                    >
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-4 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isUploading ? '업로드 중...' : '이미지 선택'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingGame ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
