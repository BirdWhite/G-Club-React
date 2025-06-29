'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import GameSearchSelect from '@/components/GameSearchSelect';

type Game = {
  id: string;
  name: string;
};

export default function NewGamePostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [games, setGames] = useState<Game[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    gameId: '',
    maxPlayers: 2,
    startTime: '',
  });
  const [content, setContent] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const MAX_CONTENT_LENGTH = 2000; // 최대 글자 수 제한
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 게임 목록 불러오기 (기본 게임이 없는 경우에만 실행)
  useEffect(() => {
    if (games.length === 0) {
      const fetchGames = async () => {
        try {
          const res = await fetch('/api/games?limit=10');
          if (res.ok) {
            const data = await res.json();
            setGames(data);
          }
        } catch (error) {
          console.error('게임 목록을 불러오는 중 오류 발생:', error);
          setError('게임 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };

      fetchGames();
    }
  }, [games.length]);

  // 인증 상태 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/game-mate/new');
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxPlayers' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    
    if (!formData.gameId) {
      setError('게임을 선택해주세요.');
      return;
    }
    
    if (!formData.startTime) {
      setError('시작 시간을 선택해주세요.');
      return;
    }
    
    if (formData.maxPlayers < 2 || formData.maxPlayers > 20) {
      setError('인원은 2명 이상 20명 이하로 설정해주세요.');
      return;
    }
    
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/game-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          content,
          startTime: new Date(formData.startTime).toISOString(),
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        router.push(`/game-mate/${result.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '모집글 작성을 실패했습니다.');
      }
    } catch (err) {
      console.error('모집글 작성 중 오류 발생:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 현재 날짜와 시간을 YYYY-MM-DDThh:mm 형식으로 반환
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">게임메이트 모집하기</h1>
          <p className="mt-2 text-sm text-gray-600">함께 게임을 즐길 파티원을 모집해보세요!</p>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                제목 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="예) 오늘 저녁에 함께 할 파티원 구합니다!"
                  maxLength={100}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="gameId" className="block text-sm font-medium text-gray-700">
                  게임 검색
                </label>
                <div className="mt-1">
                  <GameSearchSelect
                    value={formData.gameId}
                    onChange={(gameId) => {
                      setFormData(prev => ({
                        ...prev,
                        gameId,
                      }));
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    게임을 검색하여 선택해주세요. 원하는 게임이 없다면 관리자에게 문의해주세요.
                  </p>
                </div>
              </div>
              
              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700">
                  모집 인원 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="maxPlayers"
                    id="maxPlayers"
                    min="2"
                    max="20"
                    value={formData.maxPlayers}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">2명 이상 20명 이하로 설정해주세요.</p>
              </div>
              
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  시작 시간 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    name="startTime"
                    id="startTime"
                    min={getCurrentDateTime()}
                    value={formData.startTime}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                내용 <span className="text-red-500">*</span>
                <span className="ml-2 text-sm text-gray-500">
                  {characterCount}/{MAX_CONTENT_LENGTH}자
                </span>
              </label>
              <div className="bg-white rounded-md shadow-sm border border-gray-300">
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                      setContent(e.target.value);
                      setCharacterCount(e.target.value.length);
                    }
                  }}
                  className="w-full p-3 min-h-[200px] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="게시글 내용을 작성해주세요."
                  required
                />
              </div>
              {characterCount >= MAX_CONTENT_LENGTH && (
                <p className="mt-1 text-sm text-red-600">
                  최대 {MAX_CONTENT_LENGTH}자까지 입력 가능합니다.
                </p>
              )}
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    작성 중...
                  </>
                ) : (
                  '모집글 작성하기'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
