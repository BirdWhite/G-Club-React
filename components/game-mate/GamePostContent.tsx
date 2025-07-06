import { GamePost } from '@/types/game';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DateTimeDisplay } from '../common/DateTimeDisplay';
import { formatRelativeTime } from '@/lib/dateUtils';

interface GamePostContentProps {
  post: GamePost;
}

export default function GamePostContent({ post }: GamePostContentProps) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {post.author?.image ? (
              <div className="relative h-10 w-10 rounded-full border-2 border-gray-200 overflow-hidden">
                <img
                  src={post.author.image}
                  alt={post.author.name || '프로필 이미지'}
                  className="absolute inset-0 m-auto object-cover w-full h-full"
                  onError={(e) => {
                    // 이미지 로드 실패 시 닉네임 첫 글자 표시
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.outerHTML = `
                        <div class="h-10 w-10 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                          <span class="text-gray-500">
                            ${post.author?.name?.[0] || '?'}
                          </span>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">
                  {post.author?.name?.[0] || '?'}
                </span>
              </div>
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {post.author?.name || '익명'}
              </p>
              {post.createdAt && (
                <div className="flex space-x-1 text-sm text-gray-500">
                  <time dateTime={post.createdAt}>
                    {formatDistanceToNow(new Date(post.createdAt), { 
                      addSuffix: true, 
                      locale: ko 
                    })}
                  </time>
                  {post.updatedAt && post.createdAt !== post.updatedAt && (
                    <span>(수정됨)</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              post.status === 'OPEN' 
                ? 'bg-green-100 text-green-800' 
                : post.status === 'FULL' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {post.status === 'OPEN' ? '모집 중' : post.status === 'FULL' ? '가득 참' : '완료'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {post.participants?.filter(p => !p.isReserve).length || 0}/{post.maxPlayers}명
            </span>
          </div>
        </div>
        
        {/* 게임 시작 시간 */}
        {post.startTime && (
          <div className="mt-3 mb-4">
            <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>시작 시간: <span className="font-semibold">{formatRelativeTime(new Date(post.startTime))}</span></span>
            </div>
          </div>
        )}
        
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
}
