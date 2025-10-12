'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@/contexts/ProfileProvider';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { Comment } from '@/types/models';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Send } from 'lucide-react';

interface NoticeCommentSectionProps {
  noticeId: string;
  allowComments: boolean;
}

export function NoticeCommentSection({ noticeId, allowComments }: NoticeCommentSectionProps) {
  const { profile } = useProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 댓글 목록 조회
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notices/${noticeId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [noticeId]);

  // 댓글 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/notices/${noticeId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [...prev, newCommentData]);
        setNewComment('');
      } else {
        const errorData = await response.json();
        alert(errorData.error || '댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/notices/${noticeId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { ...comment, isDeleted: true, content: '[삭제된 댓글입니다]' }
              : comment
          )
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || '댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (allowComments) {
      fetchComments();
    }
  }, [noticeId, allowComments]);

  if (!allowComments) {
    return (
      <div className="bg-card p-4 md:p-6 rounded-2xl border border-border">
        <p className="text-muted-foreground text-center">
          이 공지사항은 댓글이 비활성화되어 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card p-4 md:p-6 rounded-2xl border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">댓글 ({comments.length})</h3>
      
      {/* 댓글 작성 폼 */}
      {profile && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 min-w-0 px-3 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="w-11 h-11 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="댓글 작성"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            댓글을 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 border border-border/30 rounded-lg hover:bg-muted/70 transition-colors">
              <ProfileAvatar 
                name={comment.author.name}
                image={comment.author.image}
                size="sm"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{comment.author.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { 
                      addSuffix: true, 
                      locale: ko 
                    })}
                  </span>
                  {profile && !comment.isDeleted && (profile.userId === comment.authorId || 
                    ['ADMIN', 'SUPER_ADMIN'].includes(profile.role?.name || '')) && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-sm text-destructive hover:text-destructive/80 transition-colors ml-auto"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p className="text-foreground">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
