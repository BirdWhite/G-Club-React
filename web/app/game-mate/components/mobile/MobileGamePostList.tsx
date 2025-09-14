'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GamePostCard from '../GamePostCard';
import GameFilter from '../GameFilter';
import { GamePost } from '@/types/models';
import { useGamePostListSubscription } from '@/hooks/useRealtimeSubscription';
import { useUrlState } from '@/hooks/useUrlState';

interface MobileGamePostListProps {
  userId?: string;
}

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired';

export default function MobileGamePostList({ userId }: MobileGamePostListProps) {
  const router = useRouter();
  
  // URL 상태 관리
  const [urlState, updateUrlState] = useUrlState({
    gameId: 'all',
    status: 'recruiting',
  });

  // URL 상태를 API 상태로 매핑
  const getApiStatus = (status: string) => {
    if (status === 'all') return undefined;
    if (status === 'recruiting') return 'recruiting';
    if (status === 'open') return 'OPEN';
    if (status === 'full') return 'FULL';
    if (status === 'completed_expired') return 'completed_expired';
    return undefined;
  };

  const { posts, loading, filters, setFilters } = useGamePostListSubscription({
    status: getApiStatus(urlState.status),
    gameId: urlState.gameId === 'all' ? undefined : urlState.gameId,
  });

  const handleGameChange = (gameId: string) => {
    updateUrlState({ gameId });
    setFilters(prev => ({ ...prev, gameId: gameId === 'all' ? undefined : gameId }));
  };

  const handleStatusChange = (status: StatusFilterType) => {
    updateUrlState({ status });
    setFilters(prev => ({ ...prev, status: getApiStatus(status) }));
  };

  const filteredPosts = posts;

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-cyber-black-50 p-4 rounded-lg shadow animate-pulse">
              <div className="h-6 bg-cyber-black-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-cyber-black-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-cyber-black-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-cyber-black-200 rounded w-full mb-3"></div>
              <div className="flex justify-between items-center">
                <div className="h-5 bg-cyber-black-200 rounded w-1/4"></div>
                <div className="h-5 bg-cyber-black-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="text-center py-12 bg-cyber-black-50 rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-cyber-gray/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-cyber-gray">모집글이 없습니다</h3>
          <p className="mt-1 text-sm text-cyber-gray/60">조건에 맞는 모집글이 없어요. 새로운 글을 작성해보세요!</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
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
      <div className="bg-cyber-black-50 p-4 rounded-lg shadow mb-6 border border-cyber-black-200">
        <GameFilter
          selectedGame={urlState.gameId}
          onGameChange={handleGameChange}
          statusFilter={urlState.status as StatusFilterType}
          onStatusChange={handleStatusChange}
        />
      </div>

      {renderPosts()}
    </div>
  );
}
