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
    <div className="bg-white shadow-sm overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={post.author.image || '/images/default-profile.png'}
                  alt={post.author.name || '프로필 이미지'}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {post.author.name || '익명'}
              </p>
              {post.createdAt && (
                <div className="flex space-x-1 text-sm text-gray-500">
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
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              post.status === 'OPEN' 
                ? 'bg-green-100 text-green-800' 
                : post.status === 'FULL' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : post.status === 'IN_PROGRESS'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
            }`}>
              {post.status === 'OPEN' ? '모집 중' : post.status === 'FULL' ? '인원 마감' : post.status === 'IN_PROGRESS' ? '게임 중' : '모집 완료'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {post._count?.participants || 0}/{post.maxParticipants}명
            </span>
          </div>
        </div>
        
        {/* 게임 시작 시간 */}
        {post.startTime && (
          <div className="mt-3 mb-4">
            <div className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>시작 시간: <span className="font-semibold">{isMounted ? formatRelativeTime(new Date(post.startTime)) : '...'}</span></span>
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
