'use client';

import Image from 'next/image';
import type { GamePost } from '@/types/models';
import { formatRelativeTime } from '@/lib/utils/date';
import { useEffect, useState } from 'react';

interface GamePostContentProps {
  post: GamePost;
}

export function GamePostContent({ post }: GamePostContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return (
    <div className="bg-card border border-border shadow-lg overflow-hidden rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {/* 게임 시작 시간(왼쪽) + 게임 아이콘(오른쪽) */}
        {post.startTime && (
          <div className="mb-4 flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{isMounted ? formatRelativeTime(new Date(post.startTime)) : '...'}</span>
            </div>
            {post.game && (
              post.game.iconUrl ? (
                <Image
                  src={post.game.iconUrl}
                  alt={post.game.name || '게임'}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-sm object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-5 w-5 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">
                    {post.game?.name?.[0] || 'G'}
                  </span>
                </div>
              )
            )}
          </div>
        )}
        
        <div className="mt-6">
          <div className="text-foreground whitespace-pre-wrap break-words">
            {post.content}
          </div>
        </div>
      </div>
    </div>
  );
}
