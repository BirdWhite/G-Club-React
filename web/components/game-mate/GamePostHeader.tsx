import type { GamePost } from '@/types/models';
import { DateTimeDisplay } from '../common/DateTimeDisplay';

interface GamePostHeaderProps {
  post: GamePost;
  onDelete: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  isAuthor: boolean;
  loading: boolean;
}

export default function GamePostHeader({ 
  post, 
  onDelete, 
  onEdit, 
  onToggleStatus, 
  isAuthor, 
  loading 
}: GamePostHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            {/* 게임 정보 */}
            <div className="flex items-center mb-1">
              {post?.game ? (
                <div className="flex items-center">
                  {post.game.iconUrl && (
                    <img 
                      src={post.game.iconUrl} 
                      alt={post.game.name || '게임 아이콘'}
                      className="h-6 w-6 rounded mr-2"
                    />
                  )}
                  <span className="font-medium text-base text-gray-800">{post.game.name}</span>
                </div>
              ) : (
                <span className="text-gray-400">게임 정보 없음</span>
              )}
            </div>
            
            {/* 제목 */}
            <h1 className="text-2xl font-bold text-gray-900">{post?.title || '제목 없음'}</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              목록으로
            </button>
            {isAuthor && (
              <>
                <button
                  onClick={onEdit}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={onToggleStatus}
                  disabled={loading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    post.status !== 'OPEN' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50`}
                >
                  {post.status !== 'OPEN' ? '모집 재개' : '모집 마감'}
                </button>
                <button
                  onClick={onDelete}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
