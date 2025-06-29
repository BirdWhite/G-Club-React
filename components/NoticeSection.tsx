'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

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

  return (
    <section className="py-10 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link href="/boards/notice" className="text-2xl font-bold text-gray-900 hover:text-blue-600">
            공지사항
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-10 text-gray-500">등록된 공지사항이 없습니다.</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {notices.map((notice) => (
                <li key={notice.id} className="border-b border-gray-100 last:border-0">
                  <Link 
                    href={`/posts/${notice.id}`} 
                    className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 truncate pr-4">
                      {notice.title}
                    </span>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notice.createdAt), { 
                        addSuffix: true,
                        locale: ko 
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
