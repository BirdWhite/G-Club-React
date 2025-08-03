import type { GamePost } from '@/types/models';
import { DateTimeDisplay } from '../../../components/common/DateTimeDisplay';

interface GamePostHeaderProps {
  post: GamePost;
  onDelete: () => void;
  onEdit: () => void;
  isOwner: boolean;
  loading: boolean;
}

export default function GamePostHeader({ 
  post, 
  onDelete, 
  onEdit, 
  isOwner, 
  loading 
}: GamePostHeaderProps) {
  // 상태 정보 정의 (사이버펑크 테마에 맞게 수정)
  const statusInfo = {
    OPEN: { text: '모집 중', className: 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' },
    FULL: { text: '가득 참', className: 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange/30' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30' },
    COMPLETED: { text: '모집 완료', className: 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30' },
  };
  
  const currentStatus = statusInfo[post.status] || statusInfo.COMPLETED;

  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          {/* 상태 배지와 제목 */}
          <div className="flex items-center mb-2">
            <span className={`px-3 py-1 rounded-full font-semibold text-sm ${currentStatus.className} mr-3`}>
              {currentStatus.text}
            </span>
            <h1 className="text-3xl font-bold text-cyber-gray">{post.title || '제목 없음'}</h1>
          </div>
          
          {/* 게임 정보 */}
          <div className="flex items-center">
            {post.game?.iconUrl ? (
              <img 
                src={post.game.iconUrl} 
                alt={post.game.name || '게임 아이콘'}
                className="h-8 w-8 rounded-md mr-3"
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center mr-3">
                <span className="text-indigo-800 font-bold text-sm">
                  {post.game?.name?.[0] || 'G'}
                </span>
              </div>
            )}
            <span className="font-semibold text-lg text-cyber-gray">{post.game?.name || '게임 정보 없음'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            목록
          </button>
          {isOwner && (
            <>
              <button
                onClick={onEdit}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-cyber-purple border border-transparent rounded-md shadow-sm hover:bg-cyber-purple/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-purple disabled:opacity-50 transition-colors duration-200"
              >
                수정
              </button>
              <button
                onClick={onDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-cyber-red border border-transparent rounded-md shadow-sm hover:bg-cyber-red/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-red disabled:opacity-50 transition-colors duration-200"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
