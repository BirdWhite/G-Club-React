'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GamePostCard from './components/GamePostCard';
import GameFilter from './components/GameFilter';
import { Game, GamePost } from '@/types/models';

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed';

export default function GameMatePage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // 사용자 정보 가져오기
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
      } catch (error) {
        console.error('사용자 정보를 가져오는 중 오류 발생:', error);
        setUser(null);
      }
    };
    
    // 초기 사용자 정보 로드
    getUser();
    
    // 페이지 가시성 변경 시 사용자 정보 갱신
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getUser();
      }
    };
    
    // 페이지 가시성 변경 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 클린업 함수
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [posts, setPosts] = useState<GamePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('recruiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGameDropdownOpen, setIsGameDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 게시글 가져오기
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (selectedGame && selectedGame !== 'all') {
        queryParams.append('gameId', selectedGame);
      }
      
      // 상태 필터에 따라 다른 파라미터 전송
      if (statusFilter === 'recruiting') {
        // 모집 중 (OPEN + FULL)
        queryParams.append('status', 'recruiting');
      } else if (statusFilter === 'open') {
        // 자리 있음 (OPEN)
        queryParams.append('status', 'OPEN');
      } else if (statusFilter === 'full') {
        // 가득 참 (FULL)
        queryParams.append('status', 'FULL');
      } else if (statusFilter === 'completed') {
        // 완료됨 (COMPLETED)
        queryParams.append('status', 'COMPLETED');
      } else if (statusFilter === 'all') {
        // 모든 상태 (파라미터 추가 안 함)
      }
      
      const apiUrl = `/api/game-posts?${queryParams.toString()}`;
      console.log('API 요청 URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 응답 오류:', response.status, errorText);
        throw new Error(`게시글을 불러오는데 실패했습니다: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API 응답 데이터:', data);
      
      // API 응답이 배열 형태로 오므로 그대로 설정
      // TODO: 실제 API 응답에 따라 데이터 매핑 필요할 수 있음
      setPosts(data);
      
    } catch (error) {
      console.error('게시글을 불러오는 중 오류 발생:', error);
      // 여기서 에러 상태를 설정하거나 사용자에게 알림을 표시할 수 있습니다.
    } finally {
      setLoading(false);
    }
  }, [selectedGame, statusFilter]);

  // 게임이나 상태 필터가 변경되면 게시글 다시 불러오기
  useEffect(() => {
    fetchPosts();
  }, [selectedGame, statusFilter, fetchPosts]);



  // 검색어 필터링 (게임 검색용 - 필요시 사용)
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // 상태 필터 변경 핸들러
  const handleStatusChange = useCallback((status: StatusFilterType) => {
    console.log('Status changed to:', status);
    setStatusFilter(status);
    // 상태가 변경되면 게시글을 다시 불러옵니다.
    fetchPosts();
  }, [fetchPosts]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsGameDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 참여하기 버튼 클릭 핸들러
  const handleJoinClick = (post: GamePost) => {
    console.log('참여 신청:', post.id);
    // TODO: 참여 신청 API 호출
  };

  // 참여 취소 버튼 클릭 핸들러
  const handleCancelClick = (post: GamePost) => {
    console.log('참여 취소:', post.id);
    // TODO: 참여 취소 API 호출
  };

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
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
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <GamePostCard 
            key={post.id}
            post={post}
            onJoin={handleJoinClick}
            onCancel={handleCancelClick}
          />
        ))}
      </div>
    );
  };

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
          <GameFilter
            games={games}
            selectedGame={selectedGame}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            onGameChange={setSelectedGame}
            onStatusChange={(status) => {
              console.log('[부모] setStatusFilter 호출:', status);
              setStatusFilter(status);
              fetchPosts(); // 상태가 변경되면 즉시 게시글 재요청
            }}
            onSearch={handleSearch}
          />
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
        {renderPosts()}
      </div>
    </div>
  );
}
