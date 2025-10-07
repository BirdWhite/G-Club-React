'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Button } from '@/components/ui/button';
import { RichTextViewer } from '@/components/editor/RichTextViewer';
import { NoticeCommentSection } from '@/components/notices/NoticeCommentSection';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { Eye, ChevronLeft, X, Pin } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileProvider';
import type { Notice } from '@/types/models';

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useProfile();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const noticeId = params.id as string;

  // 조회수 증가 (페이지 로드 시 한 번만)
  const viewCountIncremented = useRef(false);
  
  useEffect(() => {
    if (!viewCountIncremented.current) {
      viewCountIncremented.current = true;
      
      const incrementViewCount = async () => {
        try {
          await fetch(`/api/notices/${noticeId}/view`, { 
            method: 'POST' 
          });
        } catch (error) {
          console.error('조회수 증가 실패:', error);
        }
      };
      
      incrementViewCount();
    }
  }, [noticeId]);

  // 공지사항 상세 조회
  const fetchNotice = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notices/${noticeId}`);
      
      if (response.ok) {
        const data = await response.json();
        setNotice(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '공지사항을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [noticeId]);

  // 공지사항 삭제
  const handleDelete = async () => {
    if (!notice) return;
    
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('공지사항이 삭제되었습니다.');
        router.push('/notices');
      } else {
        const errorData = await response.json();
        alert(errorData.error || '공지사항 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      alert('공지사항 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (noticeId) {
      fetchNotice();
    }
  }, [noticeId, fetchNotice]);

  // 권한 체크 함수 (관리자만)
  const canEditOrDelete = (): boolean => {
    if (!profile) return false;
    
    // 관리자 권한만 체크
    const isAdmin = profile.role && ['ADMIN', 'SUPER_ADMIN'].includes(profile.role.name);
    
    return !!isAdmin;
  };

  if (isLoading || profileLoading) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <X className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              공지사항을 찾을 수 없습니다
            </h3>
            <p className="text-muted-foreground mb-6">
              {error || '요청하신 공지사항이 존재하지 않거나 삭제되었습니다.'}
            </p>
            <Link
              href="/notices"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
            >
              공지사항 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <Link
            href="/notices"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            공지사항 목록
          </Link>
        </div>

        {/* 공지사항 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {notice.isPinned && (
              <span className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
                <Pin className="w-3 h-3 inline mr-1" />
                고정
              </span>
            )}
            {!notice.isPublished && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-600 text-sm rounded-full">
                임시저장
              </span>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {notice.title}
          </h1>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ProfileAvatar 
                  name={notice.author.name}
                  image={notice.author.image}
                  size="sm"
                />
                <span>{notice.author.name}</span>
                {notice.lastModifiedBy && notice.lastModifiedBy.userId !== notice.authorId && (
                  <span className="text-xs text-muted-foreground">
                    (수정됨: {notice.lastModifiedBy.name})
                  </span>
                )}
              </div>
              <DateTimeDisplay 
                date={notice.publishedAt || notice.createdAt}
                className="text-sm"
              />
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span>{notice.viewCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 공지사항 내용 */}
        <div className="bg-card p-8 rounded-2xl border border-border">
          <RichTextViewer content={notice.content} />
        </div>

        {/* 요약 (있는 경우) */}
        {notice.summary && (
          <div className="mt-8 p-6 bg-muted rounded-2xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">요약</h3>
            <p className="text-muted-foreground leading-relaxed">
              {notice.summary}
            </p>
          </div>
        )}

        {/* 댓글 섹션 */}
        <div className="mt-8">
          <NoticeCommentSection 
            noticeId={noticeId} 
            allowComments={notice.allowComments} 
          />
        </div>

        {/* 액션 버튼들 */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/notices"
            className="h-10 px-4 flex items-center bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            목록으로
          </Link>
          
          {/* 수정/삭제 버튼은 권한이 있는 사용자에게만 표시 */}
          {canEditOrDelete() && (
            <div className="flex gap-2">
              <Link
                href={`/notices/${noticeId}/edit`}
                className="h-10 px-4 flex items-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
              >
                수정
              </Link>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
                className="h-10 px-4"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
