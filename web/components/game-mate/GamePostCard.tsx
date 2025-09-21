'use client';

import Link from 'next/link';
import { format, isToday, isYesterday, isTomorrow, isThisYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import { GamePost } from '@/types/models';
import { Clock, Users } from 'lucide-react';
import { JsonValue } from '@prisma/client/runtime/library';

// TipTap JSON content에서 텍스트만 추출하는 함수
const extractTextFromContent = (content: JsonValue): string => {
  if (!content || typeof content !== 'object' || !('content' in content) || !Array.isArray(content.content)) {
    return '';
  }
  
  return content.content
    .map((node: any) => {
      if (node.type === 'paragraph' && node.content) {
        return node.content.map((textNode: any) => textNode.text || '').join('');
      }
      return '';
    })
    .join(' ')
    .trim();
};

interface GamePostCardProps {
  post: GamePost;
  currentUserId?: string;
}

const GamePostCard = ({ post, currentUserId }: GamePostCardProps) => {
  const isOwner = post.author?.id === currentUserId;
  const isParticipating = post.participants?.some(p => p.userId === currentUserId);
  const isWaiting = post.waitingList?.some(w => w.userId === currentUserId);

  // 게임 시간 포맷팅 함수
  const formatGameTime = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    let dateStr = '';
    
    if (isToday(date)) {
      dateStr = '오늘';
    } else if (isYesterday(date)) {
      dateStr = '어제';
    } else if (isTomorrow(date)) {
      dateStr = '내일';
    } else {
      dateStr = format(date, isThisYear(date) ? 'M월 d일 (E)' : 'yyyy년 M월 d일 (E)', { locale: ko });
    }
    
    const timeStr = format(date, 'a h:mm', { locale: ko });
    
    return { dateStr, timeStr };
  };

  const { dateStr, timeStr } = formatGameTime(post.startTime);
  const statusInfo = {
    OPEN: { text: '모집 중', className: 'bg-chart-3/20 text-chart-3 group-hover:bg-chart-3/30' },
    FULL: { text: '가득 참', className: 'bg-chart-4/20 text-chart-4 group-hover:bg-chart-4/30' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-chart-2/20 text-chart-2 group-hover:bg-chart-2/30' },
    COMPLETED: { text: '완료 됨', className: 'bg-card-foreground/20 text-card-foreground group-hover:bg-card-foreground/30' },
    EXPIRED: { text: '만료 됨', className: 'bg-destructive/20 text-destructive group-hover:bg-destructive/30' },
  };
  
  // 내가 참여중이면 상태를 "참여중"으로 표시 (완료/만료 상태가 아닐 때만)
  const getDisplayStatus = () => {
    if (!isOwner && isParticipating && post.status !== 'COMPLETED' && post.status !== 'EXPIRED') {
      return { text: '참여 중', className: 'bg-primary/20 text-primary group-hover:bg-primary/30' };
    }
    return statusInfo[post.status] || statusInfo.COMPLETED;
  };
  
  const currentStatus = getDisplayStatus();
  const plainContent = extractTextFromContent(post.content);

  return (
    <div className="group bg-card overflow-hidden shadow rounded-lg transition-all duration-300 flex flex-col h-full relative hover:shadow-lg hover:-translate-y-1 border border-border">
      <Link href={`/game-mate/${post.id}`} className="flex-1 flex flex-col p-4">
        {/* 상단: 시간 및 상태 */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center text-chart-2">
            <Clock className="h-4 w-4 mr-1 text-chart-2" />
            <time dateTime={typeof post.startTime === 'string' ? post.startTime : post.startTime.toISOString()}>
              {isToday(new Date(post.startTime)) ? timeStr : `${dateStr} ${timeStr}`}
            </time>
          </div>
          <span className={`px-2 py-1 rounded-full font-semibold transition-colors duration-300 ${currentStatus.className}`}>
            {currentStatus.text}
          </span>
        </div>

        {/* 중단: 게임 정보, 제목, 작성자, 내용 */}
        <div className="flex items-center min-w-0 mb-2">
            {post.game?.iconUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden mr-2 flex-shrink-0">
                <img 
                  src={post.game.iconUrl} 
                  alt={post.game.name}
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
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
              {post.title}
            </h3>
            <div className="text-sm text-card-foreground/70 group-hover:text-card-foreground transition-colors duration-300 flex-shrink-0 mt-1">
              {post.author?.name || '익명'}
            </div>
        </div>

        <p className="text-sm text-card-foreground/80 group-hover:text-card-foreground transition-colors duration-300 line-clamp-2 mb-4 flex-grow">
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

        {/* 참여 상태 오버레이 (우측 하단) - 대기중과 참여 가능만 표시 (완료/만료 상태 제외) */}
        {!isOwner && post.status !== 'COMPLETED' && post.status !== 'EXPIRED' && (
          <div className="absolute bottom-3 right-4">
            {isWaiting ? (
              <span className="px-3 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-full shadow-md">
                대기중
              </span>
            ) : (
               post.status === 'OPEN' && !isParticipating && (
                <span className="px-3 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                  참여 가능
                </span>
               )
            )}
          </div>
        )}
      </Link>
    </div>
  );
};

export { GamePostCard };
