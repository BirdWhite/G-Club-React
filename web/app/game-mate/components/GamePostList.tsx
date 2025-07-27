'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GamePostCard from './GamePostCard';
import GameFilter from './GameFilter';
import { GamePost } from '@/types/models';
import { PlusCircle } from 'lucide-react';
import { useGamePostListSubscription } from '@/hooks/useRealtimeSubscription';

interface GamePostListProps {
  userId?: string;
}

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed';

export default function GamePostList({ userId }: GamePostListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { posts, loading, filters, setFilters } = useGamePostListSubscription({
    status: 'recruiting',
  });

  const handleGameChange = (gameId: string) => {
    setFilters(prev => ({ ...prev, gameId: gameId === 'all' ? undefined : gameId }));
  };

  const handleStatusChange = (status: StatusFilterType) => {
    setFilters(prev => ({ ...prev, status: status === 'all' ? undefined : status }));
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">모집글이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">조건에 맞는 모집글이 없어요. 새로운 글을 작성해보세요!</p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPosts.map((post: GamePost) => (
          <GamePostCard 
            key={post.id}
            post={post}
            currentUserId={userId}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
        <GameFilter
          selectedGame={filters.gameId || 'all'}
          onGameChange={handleGameChange}
          statusFilter={(filters.status as StatusFilterType) || 'all'}
          onStatusChange={handleStatusChange}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
        <div className="mt-6 text-right">
          <button
            type="button"
            onClick={() => router.push('/game-mate/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            새 모집글 작성하기
          </button>
        </div>
      </div>

      {renderPosts()}
    </div>
  );
}