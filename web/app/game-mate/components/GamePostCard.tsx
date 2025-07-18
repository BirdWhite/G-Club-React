import Link from 'next/link';
import { format, isToday, isYesterday, isTomorrow, isThisYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import { GamePost } from '@/types/models';

interface GamePostCardProps {
  post: GamePost;
  onJoin?: (post: GamePost) => void;
  onCancel?: (post: GamePost) => void;
}

const GamePostCard = ({ post, onJoin, onCancel }: GamePostCardProps) => {
  const [isCurrentUserPost, setIsCurrentUserPost] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('사용자 정보를 가져오는 중 오류 발생:', error);
          return;
        }
        
        setIsCurrentUserPost(user?.id === post.author?.userId);
      } catch (error) {
        console.error('인증 오류:', error);
      }
    };
    
    checkUser();
  }, [post.author?.userId, supabase]);
  
  // 게임 시간 포맷팅 함수
  const formatGameTime = (dateInput: string | Date) => {
    // dateInput이 문자열이면 Date 객체로 변환, 이미 Date 객체면 그대로 사용
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    let dateStr = '';
    
    if (isToday(date)) {
      dateStr = '오늘';
    } else if (isYesterday(date)) {
      dateStr = '어제';
    } else if (isTomorrow(date)) {
      dateStr = '내일';
    } else {
      // 올해가 아닌 경우에만 연도 표시
      dateStr = format(date, isThisYear(date) ? 'M월 d일 (E)' : 'yyyy년 M월 d일 (E)', { locale: ko });
    }
    
    // 시간은 항상 표시 (오전/오후 hh:mm)
    const timeStr = format(date, 'a h:mm', { locale: ko });
    
    return { dateStr, timeStr, isToday: isToday(date) };
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onJoin?.(post);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel?.(post);
  };

  return (
    <div className="group bg-white overflow-hidden shadow rounded-lg transition-all duration-300 flex flex-col h-full relative hover:shadow-lg hover:-mt-1 hover:mb-1 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50">
      <Link href={`/game-mate/${post.id}`} className="flex-1 flex flex-col p-4">
        {/* 상단: 게임 정보 및 상태 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            {post.game?.iconUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 mr-2">
                <img 
                  src={post.game.iconUrl} 
                  alt={post.game.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-2">
                <span className="text-indigo-800 font-medium text-xs">
                  {post.game?.name?.[0] || 'G'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors duration-300">
              {post.game?.name || '게임'}
            </span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
            post.status === 'OPEN' ? 'bg-green-100 text-green-800 group-hover:bg-green-200 group-hover:text-green-900' : 
            post.status === 'FULL' ? 'bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200 group-hover:text-yellow-900' : 
            'bg-gray-100 text-gray-800 group-hover:bg-gray-200 group-hover:text-gray-900'
          }`}>
            {post.status === 'OPEN' ? '모집 중' : 
             post.status === 'FULL' ? '마감 임박' : 
             '모집 완료'}
          </span>
        </div>

        {/* 게임 시간 - 제목 위로 이동 */}
        <div className="flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors duration-300 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <time dateTime={post.startTime instanceof Date ? post.startTime.toISOString() : post.startTime} className="font-semibold">
            {formatGameTime(post.startTime).dateStr} {formatGameTime(post.startTime).timeStr}
          </time>
        </div>

        {/* 제목과 작성자 */}
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300 line-clamp-1">
            {post.title} <span className="text-sm font-normal text-gray-500 group-hover:text-gray-600 transition-colors duration-300 ml-1">• {post.author?.name || '익명'}</span>
          </h3>
        </div>
        <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 line-clamp-2 mb-3">{post.content}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex-1">
            {/* 참여 버튼 - 본인 글에는 표시하지 않음 */}
            {!isCurrentUserPost && (
              <div>
                {post.status === 'COMPLETED' ? (
                  <span className="text-sm text-gray-500">모집 완료</span>
                ) : post.isParticipating === true ? (
                  <button 
                    className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium"
                    onClick={handleCancelClick}
                  >
                    참여 중
                  </button>
                ) : (
                  <button 
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors font-medium ${
                      post.status === 'FULL' 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={handleJoinClick}
                  >
                    {post.status === 'FULL' ? '대기 신청' : '참여하기'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* 참여자 수 - 항상 오른쪽에 표시 */}
          <div className="flex items-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium text-gray-900">{post._count?.participants || 0}</span>/{post.maxPlayers}명
          </div>
        </div>
      </Link>
    </div>
  );
};

export default GamePostCard;
