'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { useProfile } from '@/contexts/ProfileProvider';
import { Eye, Megaphone, Pin } from 'lucide-react';
import { extractFirstImageUrl } from '@/lib/utils';
import type { Notice } from '@/types/models';

interface NoticeResponse {
  success: boolean;
  notices: Notice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function NoticesPage() {
  const { profile } = useProfile();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 관리자 권한 확인
  const isAdmin = profile?.role?.name === 'SUPER_ADMIN' || profile?.role?.name === 'ADMIN';

  // 공지사항 목록 조회
  const fetchNotices = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        includeUnpublished: isAdmin ? 'true' : 'false'
      });

      const response = await fetch(`/api/notices?${params}`);
      const data: NoticeResponse = await response.json();

      if (data.success) {
        setNotices(data.notices);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setError(null);
      } else {
        setError('공지사항을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchNotices(page);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  if (isLoading && notices.length === 0) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
        <div className="w-full max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground">공지사항</h1>
            {isAdmin && (
              <Link
                href="/notices/new"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                작성하기
              </Link>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* 공지사항 목록 */}
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                공지사항이 없습니다
              </h3>
              <p className="text-muted-foreground">
                새로운 공지사항이 올라오면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            notices.map((notice) => {
              const thumbnailUrl = extractFirstImageUrl(notice.content);
              return (
                <Link
                  key={notice.id}
                  href={`/notices/${notice.id}`}
                  className="flex rounded-2xl shadow-lg border border-border bg-card transition-all hover:shadow-xl hover:bg-card/80 overflow-hidden"
                >
                  {thumbnailUrl && (
                    <div className="relative shrink-0 w-[120px] sm:w-[160px] aspect-video self-stretch">
                      <img
                        src={thumbnailUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {notice.isPinned && (
                          <span className="shrink-0 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full flex items-center gap-1">
                            <Pin className="w-3 h-3" />
                            고정
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                          {notice.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-2">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{notice.viewCount}</span>
                        </div>
                      </div>
                    </div>
                    
                    {notice.summary && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {notice.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <DateTimeDisplay 
                        date={notice.publishedAt || notice.createdAt}
                        className="text-xs"
                      />
                      <div className="flex items-center gap-4">
                        <span>
                          {notice.author.name}
                          {notice.lastModifiedBy && notice.lastModifiedBy.userId !== notice.authorId && (
                            <span className="text-muted-foreground">
                              {' '}(수정: {notice.lastModifiedBy.name})
                            </span>
                          )}
                        </span>
                      </div>
                      {!notice.isPublished && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-600 text-xs rounded-full">
                          임시저장
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
