'use client';

import { useRouter } from 'next/navigation';
import { GamePostCard } from './GamePostCard';
import { GameFilter } from './GameFilter';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { GamePost } from '@/types/models';
import { PlusCircle, Plus } from 'lucide-react';

interface GamePostListProps {
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

export function GamePostList({ 
  userId, 
  posts, 
  loading = false,
  urlState, 
  onGameChange, 
  onStatusChange 
}: GamePostListProps) {
  const router = useRouter();

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    if (posts.length === 0) {
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
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post: GamePost) => (
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
    <div className="relative">
      {/* 필터 영역 - 모바일에서는 sticky 헤더로 고정, 데스크톱에서는 inline 배치 */}
      <div className="sticky md:relative top-0 z-10 bg-background/95 backdrop-blur-sm md:backdrop-blur-none md:bg-transparent border-b md:border-b-0 border-border py-4 md:py-0 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <GameFilter
            selectedGame={urlState.gameId}
            onGameChange={onGameChange}
            statusFilter={urlState.status as StatusFilterType}
            onStatusChange={onStatusChange}
          />
        </div>
        
        {/* 데스크톱 전용 모집글 작성 버튼 */}
        <div className="hidden md:flex lg:flex-shrink-0 items-center">
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

      {/* 포스트 리스트 */}
      <div className="pt-2 md:pt-0">
        {renderPosts()}
      </div>

      {/* 📱 모바일 전용 플로팅 작성 버튼 (하단 네비바 위에 띄움) */}
      <button
        onClick={() => router.push('/game-mate/new')}
        className="fixed md:hidden bottom-24 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl transition-all duration-200 flex items-center justify-center z-50 transform hover:scale-105"
        style={{
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        aria-label="새 모집글 작성"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
