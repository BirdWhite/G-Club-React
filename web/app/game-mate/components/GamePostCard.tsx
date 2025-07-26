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
    OPEN: { text: '모집 중', className: 'bg-green-100 text-green-800 group-hover:bg-green-200 group-hover:text-green-900' },
    FULL: { text: '인원 마감', className: 'bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200 group-hover:text-yellow-900' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-purple-100 text-purple-800 group-hover:bg-purple-200 group-hover:text-purple-900' },
    COMPLETED: { text: '모집 완료', className: 'bg-gray-100 text-gray-800 group-hover:bg-gray-200 group-hover:text-gray-900' },
  };
  
  const currentStatus = statusInfo[post.status] || statusInfo.COMPLETED;
  const plainContent = extractTextFromContent(post.content);

  return (
    <div className="group bg-white overflow-hidden shadow rounded-lg transition-all duration-300 flex flex-col h-full relative hover:shadow-lg hover:-translate-y-1">
      <Link href={`/game-mate/${post.id}`} className="flex-1 flex flex-col p-4">
        {/* 상단: 상태 및 시간 */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className={`px-2 py-1 rounded-full font-semibold transition-colors duration-300 ${currentStatus.className}`}>
            {currentStatus.text}
          </span>
          <div className="flex items-center text-gray-500">
            <Clock className="h-4 w-4 mr-1 text-gray-400" />
            <time dateTime={typeof post.startTime === 'string' ? post.startTime : post.startTime.toISOString()}>
              {dateStr} {timeStr}
            </time>
          </div>
        </div>

        {/* 중단: 게임 정보, 제목, 작성자, 내용 */}
        <div className="flex items-center min-w-0 mb-2">
            {post.game?.iconUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 mr-2 flex-shrink-0">
                <img 
                  src={post.game.iconUrl} 
                  alt={post.game.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-indigo-800 font-medium text-xs">
                  {post.game?.name?.[0] || 'G'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors duration-300 truncate">
              {post.game?.name || '게임'}
            </span>
        </div>
        
        <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300 line-clamp-2">
              {post.title}
            </h3>
            <div className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300 flex-shrink-0 mt-1">
              {post.author?.name || '익명'}
            </div>
        </div>

        <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 line-clamp-2 mb-4 flex-grow">
          {plainContent}
        </p>

        {/* 하단: 참여 인원 */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1.5 text-gray-400" />
            <span className="font-medium text-gray-900">
              {`${post._count?.participants || 0} / ${post.maxParticipants}명`}
            </span>
            {post._count && post._count.waitingList > 0 && (
              <span className="ml-2 text-blue-600 font-medium">(+{post._count.waitingList} 대기)</span>
            )}
          </div>
        </div>

        {/* 참여 상태 오버레이 (우측 하단) */}
        {!isOwner && (
          <div className="absolute bottom-3 right-4">
            {isParticipating ? (
              <span className="px-3 py-1.5 text-sm font-semibold text-white bg-green-500 rounded-full shadow-md">
                참여중
              </span>
            ) : isWaiting ? (
              <span className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-full shadow-md">
                대기중
              </span>
            ) : (
               post.status === 'OPEN' && (
                <span className="px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
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

export default GamePostCard;
