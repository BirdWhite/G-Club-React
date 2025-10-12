'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { useProfile } from '@/contexts/ProfileProvider';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCommentSubscription } from '@/hooks/useRealtimeSubscription';
// import type { Comment } from '@/types/models'; // 현재 미사용

interface CommentSectionProps {
  gamePostId: string;
}

// Comment 타입을 사용하므로 별도 인터페이스 불필요

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
      {/* 댓글 작성 폼 */}
      <form onSubmit={handleSubmitComment} className="flex gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          maxLength={500}
          className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground h-10"
        />
        <Button 
          type="submit" 
          disabled={isSubmitting || !newComment.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-10"
        >
          {isSubmitting ? '작성 중...' : '작성'}
        </Button>
      </form>

      {/* 댓글 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-cyber-gray">
            댓글을 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-cyber-gray">
            아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-4 bg-cyber-dark/50 border border-cyber-gray/30 rounded-lg hover:bg-cyber-dark/70 transition-colors">
              <ProfileAvatar
                name={comment.author.name}
                image={comment.author.image}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {comment.author.name}
                    </span>
                    <time 
                      dateTime={typeof comment.createdAt === 'string' ? comment.createdAt : comment.createdAt.toISOString()}
                      className="text-xs text-foreground/70"
                    >
                      {isMounted ? formatDistanceToNow(new Date(comment.createdAt), { 
                        addSuffix: true, 
                        locale: ko 
                      }) : '...'}
                    </time>
                  </div>
                  {!comment.isDeleted && profile && (profile.userId === comment.authorId || 
                    ['ADMIN', 'SUPER_ADMIN'].includes(profile.role?.name || '')) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 h-auto"
                    >
                      삭제
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
