'use client';

import type { GamePost } from '@/types/models';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatRelativeTime } from '@/lib/dateUtils';
import RichTextViewer from '@/components/editor/RichTextViewer';
import { useEffect, useState } from 'react';

interface GamePostContentProps {
  post: GamePost;
}

export default function GamePostContent({ post }: GamePostContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return (
    <div className="bg-cyber-black-200 border border-cyber-black-300 shadow-lg overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center mb-6">
          <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-white p-0.5">
              <Image
                src={post.author.image || '/images/default-profile.png'}
                alt={post.author.name || '프로필 이미지'}
                fill
                sizes="40px"
                className="object-cover rounded-full"
              />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-cyber-gray">
              {post.author.name || '익명'}
            </p>
            {post.createdAt && (
              <div className="flex space-x-1 text-sm text-cyber-gray/60">
                <time dateTime={typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString()}>
                  {isMounted ? formatDistanceToNow(new Date(post.createdAt), { 
                    addSuffix: true, 
                    locale: ko 
                  }) : '...'}
                </time>
                {isMounted && post.updatedAt && new Date(post.createdAt).getTime() !== new Date(post.updatedAt).getTime() && (
                  <span>(수정됨)</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 게임 시작 시간 */}
        {post.startTime && (
          <div className="mt-3 mb-4">
            <div className="inline-flex items-center px-3 py-1.5 bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30 rounded-full text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{isMounted ? formatRelativeTime(new Date(post.startTime)) : '...'}</span>
            </div>
          </div>
        )}
        
        <div className="prose prose-sm sm:prose-base max-w-none mt-6">
          <RichTextViewer content={post.content} />
        </div>
      </div>
    </div>
  );
}
