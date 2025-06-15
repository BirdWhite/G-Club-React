'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RichTextEditor } from '@/components';

export default function WritePostPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const boardSlug = params.slug as string;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardInfo, setBoardInfo] = useState<any>(null);
  
  // 로딩 상태 확인
  const isLoading = status === 'loading';
  
  // 게시판 정보 로드
  useEffect(() => {
    const fetchBoardInfo = async () => {
      try {
        const response = await fetch(`/api/boards/${boardSlug}/posts?limit=1`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '게시판 정보를 불러오는데 실패했습니다.');
        }
        
        setBoardInfo(data.board || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('게시판 정보 로딩 오류:', err);
      }
    };

    if (boardSlug) {
      fetchBoardInfo();
    }
  }, [boardSlug]);
  
  // 인증 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=' + encodeURIComponent(`/boards/${boardSlug}/write`));
    }
  }, [status, router, boardSlug]);
  
  // 게시글 작성 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 임시 이미지가 있는 경우 영구 저장소로 이동
      let processedContent = content;
      
      if (tempImages.length > 0) {
        const response = await fetch('/api/upload/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tempImages
          })
        });
        
        if (!response.ok) {
          throw new Error('이미지 처리 중 오류가 발생했습니다.');
        }
        
        const result = await response.json();
        
        // 임시 URL을 영구 URL로 교체
        if (result.images && Array.isArray(result.images)) {
          result.images.forEach((img: any) => {
            if (img.success && img.originalUrl && img.newUrl) {
              processedContent = processedContent.replace(
                new RegExp(img.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                img.newUrl
              );
            }
          });
        }
      }
      
      // 게시글 작성 API 호출
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          boardSlug: boardSlug,
          title,
          content: processedContent,
          published: true
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '게시글 작성 중 오류가 발생했습니다.');
      }
      
      router.push(`/boards/${boardSlug}`);
    } catch (error: any) {
      console.error('게시글 작성 오류:', error);
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
  
  // 게시판이 존재하지 않는 경우
  if (error && error.includes('존재하지 않는 게시판')) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">존재하지 않는 게시판입니다</h1>
            <p className="text-gray-700">요청하신 게시판을 찾을 수 없습니다.</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              홈으로 돌아가기
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
            {boardInfo?.name ? `${boardInfo.name}에 글쓰기` : '새 게시글 작성'}
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
                onImageUpload={handleImageUpload}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push(`/boards/${boardSlug}`)}
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
