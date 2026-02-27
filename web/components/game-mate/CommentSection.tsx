'use client';

import { useState, useEffect } from 'react';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { useProfile } from '@/contexts/ProfileProvider';
import { formatRelativeTime } from '@/lib/utils/date';
import { useCommentSubscription } from '@/hooks/useRealtimeSubscription';
import { Send } from 'lucide-react';

interface CommentSectionProps {
  gamePostId: string;
}

export function CommentSection({ gamePostId }: CommentSectionProps) {
  const { profile } = useProfile();
  const { comments, loading: isLoading } = useCommentSubscription(gamePostId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/game-posts/${gamePostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        // 실시간 구독이 자동으로 댓글 목록을 업데이트합니다
      } else {
        const error = await response.json();
        alert(error.error || '댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/game-posts/${gamePostId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 실시간 구독이 자동으로 댓글 목록을 업데이트합니다
      } else {
        const error = await response.json();
        alert(error.error || '댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };


  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">댓글 ({comments.length})</h3>

      {/* 댓글 작성 폼 */}
      {profile && (
        <form onSubmit={handleSubmitComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 min-w-0 px-3 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="w-11 h-11 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="댓글 작성"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            댓글을 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            아직 댓글이 없습니다.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 py-3 border-b border-border/50 last:border-b-0">
              <ProfileAvatar
                name={comment.author.name}
                image={comment.author.image}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{comment.author.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {isMounted ? formatRelativeTime(comment.createdAt) : '...'}
                  </span>
                  {profile && !comment.isDeleted && (profile.userId === comment.authorId ||
                    ['ADMIN', 'SUPER_ADMIN'].includes(profile.role?.name || '')) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-sm text-destructive hover:text-destructive/80 transition-colors ml-auto"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
