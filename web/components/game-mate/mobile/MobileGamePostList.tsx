'use client';

import { GamePostCard } from '../GamePostCard';
import { MobileGameFilter } from '../MobileGameFilter';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { GamePost } from '@/types/models';

interface MobileGamePostListProps {
  userId?: string;
  posts: GamePost[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  urlState: {
    gameId: string;
    status: string;
  };
  onGameChange: (gameId: string) => void;
  onStatusChange: (status: 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired') => void;
}

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired';

export function MobileGamePostList({ 
  userId, 
  posts, 
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  urlState, 
  onGameChange, 
  onStatusChange 
}: MobileGamePostListProps) {
  
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
      {/* 플로팅 필터 - 스크롤 시에도 고정 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4 mb-4">
        <MobileGameFilter
          selectedGame={urlState.gameId}
          onGameChange={onGameChange}
          statusFilter={urlState.status as StatusFilterType}
          onStatusChange={onStatusChange}
        />
      </div>

      {/* 첫 게임메이트 글이 필터에 가려지지 않도록 상단 패딩 추가 */}
      <div className="pt-2">
        {renderPosts()}
      </div>
      
      {/* 무한 스크롤 로딩 및 더 보기 버튼 */}
      {hasMore && (
        <div className="mt-6 text-center px-4">
          {loadingMore ? (
            <div className="flex justify-center items-center py-4">
              <LoadingSpinner />
              <span className="ml-2 text-muted-foreground text-sm">더 많은 게임메이트를 불러오는 중...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              더 많은 게임메이트 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
