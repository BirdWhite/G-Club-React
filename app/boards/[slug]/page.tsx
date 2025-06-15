'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface BoardInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  totalPosts: number;
  totalPages: number;
}

export default function BoardPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchBoardPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/boards/${slug}/posts?page=${currentPage}&limit=10`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '게시판 정보를 불러오는데 실패했습니다.');
        }
        
        setPosts(data.posts || []);
        setBoardInfo(data.board || null);
        setPagination(data.pagination || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('게시판 데이터 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchBoardPosts();
    }
  }, [slug, currentPage]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // 페이지네이션 컴포넌트
  const Pagination = () => {
    if (!pagination) return null;
    
    const { page, totalPages } = pagination;
    const pageNumbers = [];
    
    // 표시할 페이지 번호 범위 계산
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);
    
    // 시작 페이지가 1보다 크게 조정된 경우, 끝 페이지도 조정
    if (startPage > 1) {
      endPage = Math.min(totalPages, startPage + 4);
    }
    
    // 끝 페이지가 전체 페이지보다 작게 조정된 경우, 시작 페이지도 조정
    if (endPage < totalPages) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex justify-center mt-8">
        <nav className="inline-flex">
          {/* 이전 페이지 버튼 */}
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={`px-3 py-1 rounded-l-md border ${
              page === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            이전
          </button>
          
          {/* 페이지 번호 버튼 */}
          {pageNumbers.map((num) => (
            <button
              key={num}
              onClick={() => handlePageChange(num)}
              className={`px-3 py-1 border-t border-b ${
                num === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              {num}
            </button>
          ))}
          
          {/* 다음 페이지 버튼 */}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded-r-md border ${
              page === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            다음
          </button>
        </nav>
      </div>
    );
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">오류</h1>
            <p className="text-gray-700">{error}</p>
            <Link href="/" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!boardInfo) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">존재하지 않는 게시판입니다</h1>
            <p className="text-gray-700">요청하신 게시판을 찾을 수 없습니다.</p>
            <Link href="/" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        {/* 게시판 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{boardInfo.name}</h1>
          {boardInfo.description && (
            <p className="text-gray-600 mt-2">{boardInfo.description}</p>
          )}
        </div>
        
        {/* 게시글 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 게시글 목록 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-medium">게시글 목록</h2>
            <Link 
              href={`/boards/${slug}/write`}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              글쓰기
            </Link>
          </div>
          
          {/* 게시글이 없는 경우 */}
          {posts.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              등록된 게시글이 없습니다.
            </div>
          ) : (
            <>
              {/* 게시글 목록 테이블 */}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작성자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/posts/${post.id}`} className="text-blue-600 hover:text-blue-800">
                          {post.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {post.author.name || '알 수 없음'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(post.createdAt), { 
                          addSuffix: true,
                          locale: ko 
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* 페이지네이션 */}
              <Pagination />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
