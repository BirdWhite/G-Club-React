'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Game = {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
};

type GamePost = {
  id: string;
  title: string;
  content: string;
  maxPlayers: number;
  startTime: string;
  isClosed: boolean;
  game: {
    name: string;
  };
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    participants: number;
  };
};

export default function GameMatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [posts, setPosts] = useState<GamePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');

  // 게임 목록 불러오기
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games');
        if (res.ok) {
          const data = await res.json();
          setGames(data);
        }
      } catch (error) {
        console.error('게임 목록을 불러오는 중 오류 발생:', error);
      }
    };

    fetchGames();
  }, []);

  // 모집글 목록 불러오기
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let url = '/api/game-posts';
        const params = new URLSearchParams();
        
        if (selectedGame !== 'all') {
          params.append('gameId', selectedGame);
        }
        
        if (statusFilter) {
          params.append('status', statusFilter);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          console.log('게시물 데이터:', data);
          setPosts(data.data);
        }
      } catch (error) {
        console.error('모집글을 불러오는 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedGame, statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">게임메이트 찾기</h1>
          <p className="mt-1 text-sm text-gray-500">함께 게임을 즐길 파티원을 찾아보세요!</p>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="game" className="block text-sm font-medium text-gray-700 mb-1">
                게임 선택
              </label>
              <select
                id="game"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
              >
                <option value="all">모든 게임</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                모집 상태
              </label>
              <select
                id="status"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="recruiting">모집 중</option>
                <option value="completed">완료됨</option>
                <option value="all">모두 보기</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push('/game-mate/new')}
              className="w-full md:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              새 모집글 작성하기
            </button>
          </div>
        </div>
      </div>

      {/* 모집글 목록 */}
      <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">모집글이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">첫 번째 모집글을 작성해보세요!</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push('/game-mate/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                새 모집글 작성하기
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {post.game.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.isClosed
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {post.isClosed ? '모집 완료' : '모집 중'}
                    </span>
                  </div>
                  <Link href={`/game-mate/${post.id}`}>
                    <h3 className="mt-2 text-lg font-medium text-gray-900 line-clamp-1 hover:text-indigo-600 cursor-pointer">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{post.content}</p>
                  <div className="mt-4 flex items-center">
                    <div className="flex-shrink-0">
                      {post.author?.image ? (
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={post.author.image}
                          alt={post.author.name || '프로필 이미지'}
                          onError={(e) => {
                            // 이미지 로드 실패 시 닉네임 첫 글자 표시
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span class="text-gray-500 text-xs">
                                    ${post.author?.name?.[0] || '?'}
                                  </span>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">
                            {post.author?.name?.[0] || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-gray-600">
                        {post.author.name || '익명'}
                      </p>
                      <div className="flex space-x-1 text-sm text-gray-500">
                        <time dateTime={post.startTime}>
                          {formatDate(post.startTime)}
                        </time>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center">
                      <span className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{post._count.participants}</span>/
                        {post.maxPlayers}명
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
