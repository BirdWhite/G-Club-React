'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RichTextEditor } from '@/components';

interface PostData {
  id: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  board: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const postId = params.id as string;
  
  const [post, setPost] = useState<PostData | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(true);
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
        setTitle(data.post.title);
        setContent(data.post.content);
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
  
  // 인증 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=' + encodeURIComponent(`/posts/${postId}/edit`));
    }
  }, [status, router, postId]);
  
  // 권한 확인
  useEffect(() => {
    if (post && session?.user) {
      const isAuthor = session.user.id === post.authorId;
      
      if (!isAuthor) {
        setError('이 게시글을 수정할 권한이 없습니다.');
        setTimeout(() => {
          router.push(`/posts/${postId}`);
        }, 2000);
      }
    }
  }, [post, session, router, postId]);
  
  // 게시글 수정 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          published,
          tempImages // 임시 이미지 정보 전달
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '게시글 수정 중 오류가 발생했습니다.');
      }
      
      router.push(`/posts/${postId}`);
    } catch (error: any) {
      console.error('게시글 수정 오류:', error);
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };
  
  // 임시 이미지 처리 함수
  const handleImageUpload = (images: string[]) => {
    setTempImages(images);
  };
  
  // 로딩 중이거나 인증되지 않은 경우
  if (isLoading || status === 'unauthenticated') {
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
  
  // 게시글이 존재하지 않는 경우
  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">존재하지 않는 게시글입니다</h1>
            <p className="text-gray-700">요청하신 게시글을 찾을 수 없습니다.</p>
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            게시글 수정
          </h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="제목을 입력하세요"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <RichTextEditor 
                content={content} 
                onChange={setContent}
                postId={postId}
                onImageUpload={handleImageUpload}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push(`/posts/${postId}`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
