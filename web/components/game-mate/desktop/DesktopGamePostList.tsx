'use client';

import { useRouter } from 'next/navigation';
import { GamePostCard } from '../GamePostCard';
import { GameFilter } from '../GameFilter';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { GamePost } from '@/types/models';
import { PlusCircle } from 'lucide-react';

interface DesktopGamePostListProps {
  userId?: string;
  posts: GamePost[];
  loading?: boolean;
  urlState: {
    gameId: string;
    status: string;
  };
  onGameChange: (gameId: string) => void;
  onStatusChange: (status: 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired') => void;
}

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired';

export function DesktopGamePostList({ 
  userId, 
  posts, 
  loading = false,
  urlState, 
  onGameChange, 
  onStatusChange 
}: DesktopGamePostListProps) {
  const router = useRouter();
  
  const filteredPosts = posts;

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">모집글이 없습니다</h3>
          <p className="mt-1 text-sm text-muted-foreground">조건에 맞는 모집글이 없어요. 새로운 글을 작성해보세요!</p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center mb-6">
        <div className="flex-1">
          <GameFilter
            selectedGame={urlState.gameId}
            onGameChange={onGameChange}
            statusFilter={urlState.status as StatusFilterType}
            onStatusChange={onStatusChange}
          />
        </div>
        <div className="lg:flex-shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => router.push('/game-mate/new')}
            className="h-12 inline-flex items-center justify-center px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors cursor-pointer"
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
