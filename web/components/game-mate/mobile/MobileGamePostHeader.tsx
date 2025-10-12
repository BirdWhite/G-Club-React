import Image from 'next/image';
import type { GamePost } from '@/types/models';
import { ArrowLeft, Eye } from 'lucide-react';

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
    COMPLETED: { text: '모집 완료', className: 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30' },
    EXPIRED: { text: '만료됨', className: 'bg-cyber-red/20 text-cyber-red border border-cyber-red/30' },
  };
  
  const fullStatus = { text: '가득 참', className: 'bg-cyber-orange/20 text-cyber-orange border border-cyber-orange/30' };
  
  // OPEN 상태일 때만 가득 찬 경우 표시
  const currentStatus = (post.isFull && post.status === 'OPEN') ? fullStatus : (statusInfo[post.status] || statusInfo.COMPLETED);

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
              className="px-3 py-1.5 text-sm font-medium text-white bg-cyber-purple border border-transparent rounded-md shadow-sm hover:bg-cyber-purple/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-purple disabled:opacity-50 transition-colors duration-200"
            >
              수정
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-cyber-red border border-transparent rounded-md shadow-sm hover:bg-cyber-red/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-red disabled:opacity-50 transition-colors duration-200"
            >
              삭제
            </button>
          </div>
        )}
      </div>
      
      {/* 두 번째 줄: 게임 정보와 상태 */}
      <div className="flex items-center mb-4">
        {post.game?.iconUrl ? (
          <Image 
            src={post.game.iconUrl} 
            alt={post.game.name || '게임 아이콘'}
            width={32}
            height={32}
            className="h-8 w-8 rounded-md mr-3"
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center mr-3">
            <span className="text-indigo-800 font-bold text-sm">
              {post.game?.name?.[0] || 'G'}
            </span>
          </div>
        )}
        <span className="font-semibold text-lg text-cyber-gray mr-3">{post.game?.name || '게임 정보 없음'}</span>
        <span className={`px-3 py-1 rounded-full font-semibold text-sm ${currentStatus.className}`}>
          {currentStatus.text}
        </span>
      </div>

      {/* 세 번째 줄: 제목과 조회수 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyber-gray">{post.title || '제목 없음'}</h1>
        </div>
        {/* 조회수 */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Eye className="w-4 h-4 text-gray-500" />
          <span>{post.viewCount}</span>
        </div>
      </div>
    </div>
  );
}