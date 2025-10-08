'use client';

import Link from 'next/link';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Eye, ChevronRight, Megaphone, Pin } from 'lucide-react';
import { useNoticeListSubscription } from '@/hooks/useRealtimeSubscription';

export function NoticePreview() {
  // 실시간 구독 훅 사용
  const { notices, loading: isLoading } = useNoticeListSubscription();
  
  // 최상단 5개만 표시
  const displayNotices = notices.slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/notices"
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
          >
            <Megaphone className="w-5 h-5" />
            공지사항
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/notices"
          className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
        >
          <Megaphone className="w-5 h-5" />
          공지사항
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {notices.length === 0 ? (
        <div className="text-center py-6">
          <Megaphone className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">공지사항이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayNotices.map((notice) => (
            <Link
              key={notice.id}
              href={`/notices/${notice.id}`}
              className="block p-4 rounded-lg bg-card border border-border/50 hover:border-border hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {notice.isPinned && (
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full flex items-center gap-1">
                      <Pin className="w-3 h-3" />
                      고정
                    </span>
                  )}
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {notice.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{notice.viewCount}</span>
                </div>
              </div>
              
              {notice.summary && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {notice.summary}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{notice.author.name}</span>
                <DateTimeDisplay 
                  date={notice.publishedAt || notice.createdAt}
                  className="text-xs"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
