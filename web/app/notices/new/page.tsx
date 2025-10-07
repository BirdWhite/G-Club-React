'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/contexts/ProfileProvider';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { JsonValue } from '@prisma/client/runtime/library';

export default function NewNoticePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: { type: 'doc', content: [{ type: 'paragraph' }] } as JsonValue,
    summary: '',
    isPublished: true,
    isPinned: false,
    allowComments: true,
    priority: 0
  });
  // tempImages 상태 제거 - 더 이상 필요하지 않음

  // 관리자 권한 확인 및 ID 생성
  useEffect(() => {
    if (profile && !['ADMIN', 'SUPER_ADMIN'].includes(profile.role?.name || '')) {
      alert('관리자 권한이 필요합니다.');
      router.push('/notices');
      return;
    }

    // 페이지 로드 시 공지사항 ID 미리 생성
    const generateNoticeId = async () => {
      const existingId = localStorage.getItem('tempNoticeId');
      if (!existingId) {
        try {
          const response = await fetch('/api/notices/validate-id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ noticeId: crypto.randomUUID() }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.isValid && !result.exists) {
              localStorage.setItem('tempNoticeId', crypto.randomUUID());
            }
          }
        } catch (error) {
          console.error('ID 생성 실패:', error);
        }
      }
    };

    generateNoticeId();
  }, [profile, router]);

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
    
    // 리치텍스트 에디터 내용 확인
    const hasContent = formData.content && 
      typeof formData.content === 'object' && 
      'content' in formData.content && 
      Array.isArray((formData.content as { content: Array<{ type: string; content?: Array<{ text?: string }> }> }).content) && 
      (formData.content as { content: Array<{ type: string; content?: Array<{ text?: string }> }> }).content.some((node: { type: string; content?: Array<{ text?: string }> }) => 
        node.type === 'paragraph' && 
        node.content && 
        node.content.some((textNode: { text?: string }) => textNode.text && textNode.text.trim())
      );
    
    if (!hasContent) {
      alert('내용을 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      // localStorage에서 생성된 ID 가져오기
      const tempNoticeId = localStorage.getItem('tempNoticeId');
      
      // ID가 없으면 새로 생성
      if (!tempNoticeId) {
        alert('ID 생성에 실패했습니다. 페이지를 새로고침해주세요.');
        return;
      }
      
      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-temp-notice-id': tempNoticeId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const notice = await response.json();
        // localStorage에서 임시 ID 제거
        localStorage.removeItem('tempNoticeId');
        alert('공지사항이 작성되었습니다.');
        router.push(`/notices/${notice.id}`);
      } else {
        const errorData = await response.json();
        
        // 공지사항 생성 실패 시 업로드된 이미지들 정리
        if (tempNoticeId) {
          try {
            await fetch('/api/notices/cleanup-images', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ noticeId: tempNoticeId }),
            });
            localStorage.removeItem('tempNoticeId');
          } catch (cleanupError) {
            console.error('이미지 정리 실패:', cleanupError);
          }
        }
        
        alert(errorData.error || '공지사항 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 작성 실패:', error);
      
      // 에러 발생 시에도 이미지 정리
      const tempNoticeId = localStorage.getItem('tempNoticeId');
      if (tempNoticeId) {
        try {
          await fetch('/api/notices/cleanup-images', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ noticeId: tempNoticeId }),
          });
          localStorage.removeItem('tempNoticeId');
        } catch (cleanupError) {
          console.error('이미지 정리 실패:', cleanupError);
        }
      }
      
      alert('공지사항 작성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/notices"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 공지사항 목록
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">새 공지사항 작성</h1>
        </div>

        {/* 작성 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="공지사항 내용을 입력하세요. 이미지, 유튜브 영상, 링크 등을 추가할 수 있습니다."
                    showToolbar={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  이미지, 유튜브 영상, 링크 등을 추가할 수 있습니다.
                </p>
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
                  즉시 공개
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
              href="/notices"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              취소
            </Link>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2"
            >
              {isLoading ? '작성 중...' : '공지사항 작성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
