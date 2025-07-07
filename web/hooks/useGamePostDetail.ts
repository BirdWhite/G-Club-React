'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { GamePost, Comment, Participant } from '@/types/game';

interface UseGamePostDetailProps {
  postId: string;
}

export function useGamePostDetail({ postId }: UseGamePostDetailProps) {
  const [post, setPost] = useState<GamePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { data: session } = useSession();
  const router = useRouter();

  // 게시글 조회
  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/game-posts/${postId}`);
      
      if (!response.ok) {
        throw new Error('게시글을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setPost(data);
    } catch (err) {
      console.error('게시글 조회 중 오류 발생:', err);
      setError('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // 게시글 삭제
  const handleDelete = useCallback(async () => {
    if (!post) return;
    
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/game-posts/${post.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('게시글 삭제에 실패했습니다.');
      }
      
      toast.success('게시글이 삭제되었습니다.');
      router.push('/game-mate');
    } catch (err) {
      console.error('게시글 삭제 중 오류 발생:', err);
      toast.error('게시글 삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [post, router]);

  // 댓글 작성
  const handleCommentSubmit = useCallback(async (content: string) => {
    if (!content.trim() || !post) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/game-posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('댓글 작성에 실패했습니다.');
      }
      
      setCommentContent('');
      await fetchPost();
      toast.success('댓글이 작성되었습니다.');
    } catch (err) {
      console.error('댓글 작성 중 오류 발생:', err);
      toast.error('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [post, fetchPost]);

  // 댓글 삭제
  const handleDeleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!post) return false;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/game-posts/${post.id}/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('댓글 삭제에 실패했습니다.');
      }
      
      await fetchPost();
      toast.success('댓글이 삭제되었습니다.');
      return true;
    } catch (err) {
      console.error('댓글 삭제 중 오류 발생:', err);
      toast.error('댓글 삭제에 실패했습니다.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [post, fetchPost]);

  // 참여/취소
  const handleParticipation = useCallback(async () => {
    if (!post || !session?.user) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/game-posts/${post.id}/participate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('참여 처리 중 오류가 발생했습니다.');
      }
      
      await fetchPost();
      toast.success('참여 상태가 업데이트되었습니다.');
    } catch (err) {
      console.error('참여 처리 중 오류 발생:', err);
      toast.error('참여 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [post, session, fetchPost]);

  // 모집 상태 토글
  const toggleRecruitment = useCallback(async () => {
    if (!post) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/game-posts/${post.id}/toggle-status`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('모집 상태 변경에 실패했습니다.');
      }
      
      await fetchPost();
      toast.success('모집 상태가 변경되었습니다.');
    } catch (err) {
      console.error('모집 상태 변경 중 오류 발생:', err);
      toast.error('모집 상태 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [post, fetchPost]);

  // 리더 위임
  const handleTransferLeadership = useCallback(async (userId: string) => {
    if (!post) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/game-posts/${post.id}/transfer-leadership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('리더 위임에 실패했습니다.');
      }
      
      await fetchPost();
      toast.success('리더가 변경되었습니다.');
    } catch (err) {
      console.error('리더 위임 중 오류 발생:', err);
      toast.error('리더 위임에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [post, fetchPost]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // 파생 상태
  const isAuthor = post?.author.id === session?.user?.id;
  const isParticipating = post?.participants.some(p => p.user.id === session?.user?.id) || false;
  const isFull = post ? post.participants.length >= post.maxPlayers : false;
  const isReserved = post?.participants?.some(
    p => p.user.id === session?.user?.id && p.isReserve
  ) || false;

  return {
    // 상태
    post,
    loading,
    error,
    commentContent,
    setCommentContent,
    submitting,
    
    // 파생 상태
    isAuthor,
    isParticipating,
    isFull,
    isReserved,
    
    // 핸들러
    handleDelete,
    handleCommentSubmit,
    handleDeleteComment,
    handleParticipation,
    toggleRecruitment,
    handleTransferLeadership,
    refetch: fetchPost,
  };
}
