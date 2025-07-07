'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PostData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  board: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const postId = params.id as string;
  
  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 게시글 정보 로드
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '게시글을 불러오는데 실패했습니다.');
        }
        
        setPost(data.post);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('게시글 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      fetchPostData();
    }
  }, [postId]);
  
  // 권한 확인
  const isAuthor = post && session?.user?.id === post.authorId;
  const isAdmin = session?.user && (session.user as any).role === 'ADMIN';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  
  // 게시글 삭제 처리
  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '게시글 삭제에 실패했습니다.');
      }
      
      // 삭제 성공 시 게시판으로 이동
      router.push(`/boards/${post?.board.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('게시글 삭제 오류:', err);
      setIsDeleting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">오류</h1>
            <p className="text-gray-700">{error || '게시글을 찾을 수 없습니다.'}</p>
            <button 
              onClick={() => router.back()}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              이전 페이지로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        {/* 게시글 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Link 
                href={`/boards/${post.board.slug}`}
                className="text-sm text-blue-600 hover:underline mb-2 inline-block"
              >
                {post.board.name}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
            </div>
            
            {/* 수정/삭제 버튼 */}
            {(canEdit || canDelete) && (
              <div className="flex space-x-2">
                {canEdit && (
                  <Link 
                    href={`/posts/${post.id}/edit`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    수정
                  </Link>
                )}
                {canDelete && (
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1 text-sm border border-red-300 rounded text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <span className="mr-4">
              {post.author.name || '알 수 없음'}
            </span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), { 
                addSuffix: true,
                locale: ko 
              })}
            </span>
          </div>
          
          {/* 게시글 내용 */}
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

        </div>
        
        {/* 하단 버튼 */}
        <div className="flex justify-between">
          <Link 
            href={`/boards/${post.board.slug}`}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
