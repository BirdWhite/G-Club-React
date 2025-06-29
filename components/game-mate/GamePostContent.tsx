import { GamePost } from '@/types/game';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

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
              <div className="h-10 w-10 relative rounded-full overflow-hidden">
                <img
                  src={post.author.image}
                  alt={post.author.name || '프로필 이미지'}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    // 이미지 로드 실패 시 닉네임 첫 글자 표시
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.outerHTML = `
                        <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
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
              post.status !== 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {post.status === 'OPEN' ? '모집 중' : post.status === 'FULL' ? '정원 마감' : '모집 완료'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {post._count?.participants || 0}/{post.maxPlayers}명
            </span>
          </div>
        </div>
        
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
}
