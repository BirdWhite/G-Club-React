'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { GamePost } from '@/types/models';
import { Clock, Users, Edit, User } from 'lucide-react';
import { useEffect, useState } from 'react';

// content가 이제 string 타입이므로 텍스트 추출 함수 제거

interface GamePostCardProps {
  post: GamePost;
  currentUserId?: string;
}

const GamePostCard = ({ post, currentUserId }: GamePostCardProps) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isOwner = post.author?.userId === currentUserId;
  const isParticipating = post.participants?.some(p => p.userId === currentUserId && p.status === 'ACTIVE');
  const isWaiting = post.waitingList?.some(w => w.userId === currentUserId && w.status !== 'CANCELED');
  const statusInfo = {
    OPEN: { text: '모집 중', className: 'bg-chart-3/20 text-chart-3 group-hover:bg-chart-3/30' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-chart-2/20 text-chart-2 group-hover:bg-chart-2/30' },
    COMPLETED: { text: '완료 됨', className: 'bg-card-foreground/20 text-card-foreground group-hover:bg-card-foreground/30' },
    EXPIRED: { text: '만료 됨', className: 'bg-red-400/20 text-red-400 group-hover:bg-red-400/30' },
  };
  
  const fullStatus = { text: '가득 참', className: 'bg-chart-4/20 text-chart-4 group-hover:bg-chart-4/30' };
  
  // 게임글 상태 표시
  const getDisplayStatus = () => {
    // OPEN 상태일 때만 가득 찬 경우 표시
    if (post.isFull && post.status === 'OPEN') {
      return fullStatus;
    }
    
    return statusInfo[post.status] || statusInfo.COMPLETED;
  };
  
  const currentStatus = getDisplayStatus();
  const plainContent = post.content; // content가 이제 string 타입

  return (
    <div className="group bg-card overflow-hidden shadow rounded-lg transition-all duration-300 flex flex-col h-full relative hover:shadow-lg hover:-translate-y-1 border border-border">
      <Link href={`/game-mate/${post.id}`} className="flex-1 flex flex-col p-4">
        {/* 상단: 시간 및 상태 */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center text-chart-2">
            <Clock className="h-4 w-4 mr-1 text-chart-2" />
            <time dateTime={typeof post.startTime === 'string' ? post.startTime : post.startTime.toISOString()}>
              {isMounted ? formatDistanceToNow(new Date(post.startTime), { 
                addSuffix: true, 
                locale: ko 
              }) : '...'}
            </time>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Edit className="h-4 w-4 text-green-600" />
            )}
            {!isOwner && isParticipating && (
              <User className="h-4 w-4 text-primary" />
            )}
            {!isOwner && !isParticipating && isWaiting && (
              <Clock className="h-4 w-4 text-orange-600" />
            )}
            <span className={`px-2 py-1 rounded-full font-semibold transition-colors duration-300 ${currentStatus.className}`}>
              {currentStatus.text}
            </span>
          </div>
        </div>

        {/* 중단: 게임 정보, 제목, 작성자, 내용 */}
        <div className="flex items-center min-w-0 mb-2">
            {post.game?.iconUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden mr-2 flex-shrink-0">
                <Image 
                  src={post.game.iconUrl} 
                  alt={post.game.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-primary font-medium text-xs">
                  {post.game?.name?.[0] || 'G'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-foreground transition-colors duration-300 truncate">
              {post.game?.name || '게임'}
            </span>
        </div>
        
        <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 truncate flex-1 min-w-0">
              {post.title}
            </h3>
            <div className="text-sm text-card-foreground/70 group-hover:text-card-foreground transition-colors duration-300 flex-shrink-0 mt-1 ml-2">
              {post.author?.name || '익명'}
            </div>
        </div>

        <p className="text-sm text-card-foreground/80 group-hover:text-card-foreground transition-colors duration-300 truncate mb-4 flex-grow">
          {plainContent}
        </p>

        {/* 하단: 참여 인원 진행바 */}
          <div className="mt-auto pt-2 border-t border-border">
          {/* 진행바 (내부에 아이콘과 텍스트) */}
          <div className="relative w-full bg-card-foreground/10 rounded-full h-6 overflow-hidden">
            {/* 진행바 배경 */}
            <div 
              className={`h-full transition-all duration-300 ease-out ${
                post.status === 'COMPLETED' || post.status === 'EXPIRED'
                  ? 'bg-card-foreground/30' 
                  : (post._count?.participants || 0) >= post.maxParticipants
                    ? 'bg-chart-3/70'
                    : 'bg-gradient-to-r from-primary/70 to-chart-3/70'
              }`}
              style={{ 
                width: `${Math.min(((post._count?.participants || 0) / post.maxParticipants) * 100, 100)}%` 
              }}
            />
            
            {/* 좌측 고정 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-start pl-2">
              <div className="flex items-center text-xs font-semibold text-white/80">
                <Users className="h-3 w-3 mr-1" />
                <span>{`${post._count?.participants || 0}/${post.maxParticipants}`}</span>
              </div>
            </div>
          </div>
        </div>

      </Link>
    </div>
  );
};

export { GamePostCard };
