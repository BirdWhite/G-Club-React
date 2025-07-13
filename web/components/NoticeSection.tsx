'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    name: string | null;
    image: string | null;
  };
}

export const NoticeSection = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/posts/notices?limit=5');
        
        if (!response.ok) {
          throw new Error('공지사항을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setNotices(data.notices || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('공지사항 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, []);

  if (error) {
    return (
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold text-cyber-gray mb-4 flex items-center gap-2">
          <MegaphoneIcon className="h-5 w-5 text-cyber-blue" />
          <span className="w-2 h-6 bg-cyber-orange rounded-full mr-2"></span>
          공지사항
        </h2>
        <div className="text-cyber-gray-400">
          <p>공지사항을 불러오는 중 오류가 발생했습니다.</p>
          <p className="text-sm mt-2 text-cyber-orange/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-cyber-gray flex items-center gap-2">
          <MegaphoneIcon className="h-5 w-5 text-cyber-blue" />
          공지사항
        </h2>
        <Link 
          href="/boards/notice" 
          className="text-sm text-cyber-blue hover:text-cyber-blue/80 hover:underline flex items-center transition-colors"
        >
          더보기
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-[#1e1e24] rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-[#1a1a1f] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="p-4 rounded-lg bg-[#0f0f12] text-center">
          <p className="text-sm text-cyber-gray-500">등록된 공지사항이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => (
            <Link 
              key={notice.id} 
              href={`/posts/${notice.id}`}
              className="block py-2 px-3 -mx-2 rounded-lg hover:bg-[#16161a] transition-colors group"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-cyber-gray-100 group-hover:text-cyber-blue transition-colors font-medium line-clamp-1">
                  {notice.title}
                </h3>
                <span className="text-xs text-cyber-gray-500 ml-2 whitespace-nowrap">
                  {formatDistanceToNow(new Date(notice.createdAt), { addSuffix: true, locale: ko })}
                </span>
              </div>
              <p className="text-sm text-cyber-gray-400 mt-1 line-clamp-1">
                {notice.content.replace(/<[^>]*>?/gm, '')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
