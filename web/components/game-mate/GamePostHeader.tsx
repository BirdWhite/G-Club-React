'use client';

import Image from 'next/image';
import type { GamePost } from '@/types/models';
import { ChevronLeft, Eye } from 'lucide-react';
import { formatAbsoluteTime } from '@/lib/utils/date';
import { useEffect, useState } from 'react';

interface GamePostHeaderProps {
  post: GamePost;
  onDelete: () => void;
  onEdit: () => void;
  isOwner: boolean;
  loading: boolean;
}

export function GamePostHeader({ 
  post, 
  onDelete, 
  onEdit, 
  isOwner, 
  loading 
}: GamePostHeaderProps) {
  // 상태 정보 정의 (사이버펑크 테마에 맞게 수정)
  const statusInfo = {
    OPEN: { text: '모집 중', className: 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30' },
    COMPLETED: { text: '종료', className: 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30' },
    EXPIRED: { text: '만료', className: 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30' },
  };
  
  const fullStatus = { text: '가득 참', className: 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange/30' };
  
  // OPEN 상태일 때만 가득 찬 경우 표시
  const currentStatus = (post.isFull && post.status === 'OPEN') ? fullStatus : (statusInfo[post.status] || statusInfo.COMPLETED);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="pb-4">
      {/* 첫 번째 줄: 목록(왼쪽) | 수정·삭제(오른쪽) */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 pl-0 pr-4 py-2 text-sm font-medium text-foreground bg-transparent hover:underline focus:outline-none"
        >
          <ChevronLeft className="h-5 w-5" />
          목록
        </button>
        {isOwner && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onEdit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-foreground bg-transparent hover:underline focus:outline-none disabled:opacity-50 transition-colors duration-200"
            >
              수정
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-cyber-red bg-transparent hover:underline focus:outline-none disabled:opacity-50 transition-colors duration-200"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 두 번째 줄: 제목+상태뱃지(왼쪽) | 게임 아이콘(오른쪽) */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-3xl font-bold text-cyber-gray truncate">{post.title || '제목 없음'}</h1>
          <span className={`px-3 py-1 rounded-full font-semibold text-sm flex-shrink-0 ${currentStatus.className}`}>
            {currentStatus.text}
          </span>
        </div>
        {post.game && (
          post.game.iconUrl ? (
            <Image
              src={post.game.iconUrl}
              alt={post.game.name || '게임'}
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-muted-foreground">
                {post.game?.name?.[0] || 'G'}
              </span>
            </div>
          )
        )}
      </div>
      {/* 세 번째 줄: 작성자 · 시간 · 조회수 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{post.author?.name || '익명'}</span>
        <span>•</span>
        {post.createdAt && (
          <time dateTime={typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString?.()}>
            {isMounted ? formatAbsoluteTime(post.createdAt) : '...'}
          </time>
        )}
        <span>•</span>
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span>{post.viewCount}</span>
        </div>
      </div>
    </div>
  );
}
