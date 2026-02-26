'use client';

import type { GamePost } from '@/types/models';
import { ArrowLeft, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface MobileGamePostHeaderProps {
  post: GamePost;
  onDelete: () => void;
  onEdit: () => void;
  isOwner: boolean;
  loading: boolean;
}

export function MobileGamePostHeader({ 
  post, 
  onDelete, 
  onEdit, 
  isOwner, 
  loading 
}: MobileGamePostHeaderProps) {
  // 상태 정보 정의 (사이버펑크 테마에 맞게 수정)
  const statusInfo = {
    OPEN: { text: '모집 중', className: 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30' },
    COMPLETED: { text: '종료', className: 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30' },
    EXPIRED: { text: '만료됨', className: 'bg-cyber-red/20 text-cyber-red border border-cyber-red/30' },
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
      {/* 첫 번째 줄: 뒤로가기 버튼과 수정/삭제 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-cyber-gray hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">뒤로</span>
        </button>
        
        {/* 수정/삭제 버튼들 */}
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-foreground bg-transparent hover:underline focus:outline-none disabled:opacity-50 transition-colors duration-200"
            >
              수정
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-cyber-red bg-transparent hover:underline focus:outline-none disabled:opacity-50 transition-colors duration-200"
            >
              삭제
            </button>
          </div>
        )}
      </div>
      
      {/* 두 번째 줄: 제목+상태뱃지와 조회수 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-cyber-gray truncate">{post.title || '제목 없음'}</h1>
          <span className={`px-3 py-1 rounded-full font-semibold text-sm flex-shrink-0 ${currentStatus.className}`}>
            {currentStatus.text}
          </span>
        </div>
        {/* 작성자 • 작성시간 • 조회수 */}
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground flex-shrink-0 ml-2 text-right">
          <span>{post.author?.name || '익명'}</span>
          <span>•</span>
          {post.createdAt && (
            <time dateTime={typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString?.()}>
              {isMounted ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko }) : '...'}
            </time>
          )}
          <span>•</span>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span>{post.viewCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}