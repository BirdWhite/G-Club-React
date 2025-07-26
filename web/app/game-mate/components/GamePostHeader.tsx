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
  // 상태 정보 정의 (GamePostCard와 일관성 유지)
  const statusInfo = {
    OPEN: { text: '모집 중', className: 'bg-green-100 text-green-800' },
    FULL: { text: '가득 참', className: 'bg-yellow-100 text-yellow-800' },
    IN_PROGRESS: { text: '게임 중', className: 'bg-purple-100 text-purple-800' },
    COMPLETED: { text: '모집 완료', className: 'bg-gray-100 text-gray-800' },
  };
  
  const currentStatus = statusInfo[post.status] || statusInfo.COMPLETED;

  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          {/* 게임 정보 및 상태 */}
          <div className="flex items-center justify-between mb-2">
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
              <span className="font-semibold text-lg text-gray-800">{post.game?.name || '게임 정보 없음'}</span>
            </div>
            {/* 상태 배지 */}
            <span className={`px-3 py-1 rounded-full font-semibold text-sm ${currentStatus.className}`}>
              {currentStatus.text}
            </span>
          </div>
          
          {/* 제목 */}
          <h1 className="text-3xl font-bold text-gray-900">{post.title || '제목 없음'}</h1>
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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                수정
              </button>
              <button
                onClick={onDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
