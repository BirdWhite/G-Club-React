'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const channelName = params.channelName as string;
  
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
        
        const response = await fetch(`/api/channels/${channelName}/board/posts?page=${currentPage}&limit=10`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '게시판 정보를 불러오는데 실패했습니다.');
        }
        
        setPosts(data.posts || []);
        setBoardInfo(data.boardInfo || null); // 주석 해제 및 데이터 설정
        setPagination(data.pagination || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('게시판 데이터 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (channelName) {
      fetchBoardPosts();
    }
  }, [channelName, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  
  const PaginationComponent = () => {
    if (!pagination) return null;
    
    const { page, totalPages } = pagination;
    const pageNumbers = [];
    
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);
    
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + 4);
        } else {
            startPage = Math.max(1, endPage - 4);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex justify-center mt-8">
        <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-cyber-black-600 bg-cyber-black-200 text-sm font-medium text-cyber-gray hover:bg-cyber-black-300 disabled:opacity-50">
            <span>이전</span>
          </button>
          {pageNumbers.map((num) => (
            <button key={num} onClick={() => handlePageChange(num)} className={`relative inline-flex items-center px-4 py-2 border border-cyber-black-600 text-sm font-medium ${num === page ? 'z-10 bg-cyber-blue border-cyber-blue text-white' : 'bg-cyber-black-200 text-cyber-gray hover:bg-cyber-black-300'}`}>
              {num}
            </button>
          ))}
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-cyber-black-600 bg-cyber-black-200 text-sm font-medium text-cyber-gray hover:bg-cyber-black-300 disabled:opacity-50">
            <span>다음</span>
          </button>
        </nav>
      </div>
    );
  };


  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-cyber-black-100 text-white">...로딩 중...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-cyber-black-100 text-white">오류: {error}</div>;
  }
  
  if (!boardInfo) {
    return <div className="min-h-screen flex items-center justify-center bg-cyber-black-100 text-cyber-gray">게시판 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-cyber-black-100 text-cyber-gray py-10">
      <div className="container mx-auto px-4">
        <div className="bg-cyber-black-200 rounded-lg shadow-lg p-6 mb-6 border border-cyber-black-300">
          <h1 className="text-2xl font-bold text-white">{boardInfo.name}</h1>
          {boardInfo.description && (
            <p className="text-cyber-gray mt-2">{boardInfo.description}</p>
          )}
        </div>
        
        <div className="bg-cyber-black-200 rounded-lg shadow-lg overflow-hidden border border-cyber-black-300">
          <div className="flex items-center justify-between p-4 border-b border-cyber-black-300">
            <h2 className="text-lg font-medium text-white">게시글 목록</h2>
            <Link 
              href={`/channels/${channelName}/board/write`}
              className="px-4 py-2 bg-cyber-blue text-white text-sm font-semibold rounded-md hover:bg-sky-400 transition-colors"
            >
              글쓰기
            </Link>
          </div>
          
          {posts.length === 0 ? (
            <div className="p-10 text-center text-cyber-gray">
              등록된 게시글이 없습니다.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cyber-black-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cyber-gray uppercase tracking-wider">제목</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cyber-gray uppercase tracking-wider">작성자</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-cyber-gray uppercase tracking-wider">작성일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-black-300">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-cyber-black-200/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/channels/${channelName}/board/${post.id}`} className="text-cyber-blue hover:text-sky-300 font-medium">
                            {post.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-cyber-gray">
                          {post.author.name || '알 수 없음'}
                        </td>
                        <td className="px-6 py-4 text-sm text-cyber-gray">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationComponent />
            </>
          )}
        </div>
      </div>
    </div>
  );
} 