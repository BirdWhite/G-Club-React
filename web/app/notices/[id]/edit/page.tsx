'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useProfile } from '@/contexts/ProfileProvider';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { X } from 'lucide-react';
import type { Notice } from '@/types/models';
import { JsonValue } from '@prisma/client/runtime/library';

export default function EditNoticePage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useProfile();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: { type: 'doc', content: [{ type: 'paragraph' }] } as JsonValue,
    summary: '',
    isPublished: false,
    isPinned: false,
    allowComments: true,
    priority: 0
  });
  // tempImages 상태 제거 - 더 이상 필요하지 않음

  const noticeId = params.id as string;

  // 공지사항 데이터 로드
  const fetchNotice = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notices/${noticeId}`);
      
      if (response.ok) {
        const data = await response.json();
        setNotice(data);
        setFormData({
          title: data.title,
          content: data.content || { type: 'doc', content: [{ type: 'paragraph' }] },
          summary: data.summary || '',
          isPublished: data.isPublished,
          isPinned: data.isPinned,
          allowComments: data.allowComments,
          priority: data.priority
        });
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

  // 관리자 권한 확인
  useEffect(() => {
    if (profile && !['ADMIN', 'SUPER_ADMIN'].includes(profile.role?.name || '')) {
      alert('관리자 권한이 필요합니다.');
      router.push('/notices');
    }
  }, [profile, router]);

  useEffect(() => {
    if (noticeId) {
      fetchNotice();
    }
  }, [noticeId, fetchNotice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleContentChange = (content: JsonValue) => {
    setFormData(prev => ({
      ...prev,
      content
    }));
  };

  // handleImageUpload 함수 제거 - 더 이상 필요하지 않음

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    
    // 리치텍스트 에디터 내용 확인 (텍스트, 이미지, 유튜브 등)
    const contentNodes = formData.content && 
      typeof formData.content === 'object' && 
      'content' in formData.content
        ? (formData.content as { content: Array<{ type: string; content?: Array<{ text?: string }> }> }).content
        : [];
    const hasContent = Array.isArray(contentNodes) && contentNodes.some(
      (node: { type: string; content?: Array<{ text?: string }> }) =>
        node.type === 'image' ||
        node.type === 'youtube' ||
        (node.type === 'paragraph' && node.content?.some(
          (textNode: { text?: string }) => textNode.text && textNode.text.trim()
        ))
    );
    
    if (!hasContent) {
      alert('내용을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('공지사항이 수정되었습니다.');
        router.push(`/notices/${noticeId}`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '공지사항 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      alert('공지사항 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role?.name || '')) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="bg-background">
        <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
        <div className="w-full max-w-4xl">
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
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
        <div className="w-full max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/notices/${noticeId}`}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 공지사항 보기
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">공지사항 수정</h1>
        </div>

        {/* 수정 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border">
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  제목 *
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="공지사항 제목을 입력하세요"
                  maxLength={200}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.title.length}/200자
                </p>
              </div>

              {/* 요약 */}
              <div>
                <Label htmlFor="summary" className="text-sm font-medium text-foreground">
                  요약 (선택사항)
                </Label>
                <Input
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  placeholder="공지사항 요약을 입력하세요"
                  maxLength={500}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.summary.length}/500자
                </p>
              </div>

              {/* 내용 */}
              <div>
                <Label htmlFor="content" className="text-sm font-medium text-foreground">
                  내용 *
                </Label>
                <div className="mt-1">
                  <RichTextEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    postId={noticeId}
                    placeholder="공지사항 내용을 입력하세요. 이미지, 유튜브 영상, 링크 등을 추가할 수 있습니다."
                    showToolbar={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  이미지, 유튜브 영상, 링크 등을 추가할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 설정 옵션 */}
          <div className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">설정</h3>
            <div className="space-y-4">
              {/* 공개 여부 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary focus:ring-2"
                />
                <Label htmlFor="isPublished" className="text-sm text-foreground">
                  공개
                </Label>
              </div>

              {/* 상단 고정 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  name="isPinned"
                  checked={formData.isPinned}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary focus:ring-2"
                />
                <Label htmlFor="isPinned" className="text-sm text-foreground">
                  상단 고정
                </Label>
              </div>

              {/* 댓글 허용 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowComments"
                  name="allowComments"
                  checked={formData.allowComments}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary focus:ring-2"
                />
                <Label htmlFor="allowComments" className="text-sm text-foreground">
                  댓글 허용
                </Label>
              </div>

              {/* 우선순위 */}
              <div>
                <Label htmlFor="priority" className="text-sm font-medium text-foreground">
                  우선순위
                </Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  value={formData.priority}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className="mt-1 w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  높을수록 먼저 표시됩니다 (0-100)
                </p>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3">
            <Link
              href={`/notices/${noticeId}`}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              취소
            </Link>
            <Button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2"
            >
              {isSaving ? '수정 중...' : '공지사항 수정'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
