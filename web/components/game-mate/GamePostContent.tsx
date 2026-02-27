'use client';

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
    <div className="bg-card border border-border overflow-hidden rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {/* 게임 시작 시간 */}
        {post.startTime && (
          <div className="mb-4 flex items-center gap-2">
            <div className={`flex items-center gap-2 text-sm font-medium ${post.status === 'COMPLETED' || post.status === 'EXPIRED' ? 'text-muted-foreground' : 'text-primary'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{isMounted ? formatRelativeTime(new Date(post.startTime)) : '...'}</span>
            </div>
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
