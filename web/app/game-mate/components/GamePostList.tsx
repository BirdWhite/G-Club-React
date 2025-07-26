'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import GamePostCard from './GamePostCard';
import GameFilter from './GameFilter';
import { GamePost } from '@/types/models';
import { PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface GamePostListProps {
  userId?: string;
}

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed';

export default function GamePostList({ userId }: GamePostListProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<GamePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('recruiting');
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = useMemo(() => createClient(), []);
  
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (selectedGame && selectedGame !== 'all') {
        queryParams.append('gameId', selectedGame);
      }
      
      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/game-posts?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      setPosts(data);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGame, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const channel = supabase
      .channel('game_post_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'GameParticipant' },
        () => fetchPosts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'WaitingParticipant' },
        () => fetchPosts()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'GamePost' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchPosts]);

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
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

    if (posts.length === 0) {
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
        {posts.map((post) => (
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
          selectedGame={selectedGame}
          onGameChange={setSelectedGame}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
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