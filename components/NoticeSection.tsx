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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">공지사항</h2>
          <Link href="/boards/notice" className="text-blue-600 hover:text-blue-800 font-medium">
            더보기 &rarr;
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
                <li key={notice.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <Link href={`/posts/${notice.id}`} className="block">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-900">{notice.title}</h3>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(notice.createdAt), { 
                          addSuffix: true,
                          locale: ko 
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {notice.content.replace(/<[^>]*>?/gm, '')}
                    </p>
                    <div className="mt-2 flex items-center">
                      <span className="text-xs text-gray-500">
                        작성자: {notice.author.name || '알 수 없음'}
                      </span>
                    </div>
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
