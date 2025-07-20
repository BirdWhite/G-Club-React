'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useGamePostDetail } from '@/hooks/useGamePostDetail';
import type { GamePost, UserProfile, GameParticipant, Comment } from '@/types/models';

// 동적 임포트를 사용한 컴포넌트 로딩
const GamePostHeader = dynamic(() => import('@/components/game-mate/GamePostHeader'), { ssr: true });
const GamePostContent = dynamic(() => import('@/components/game-mate/GamePostContent'), { ssr: true });
const ParticipantList = dynamic(() => import('@/components/game-mate/ParticipantList'), { ssr: true });
const CommentsSection = dynamic(() => import('@/components/game-mate/CommentsSection'), { ssr: true });
const ActionButtons = dynamic(() => import('@/components/game-mate/ActionButtons'), { ssr: true });

// 로딩 및 에러 컴포넌트
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const ErrorView = ({ error }: { error: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
    <p>오류가 발생했습니다: {error}</p>
  </div>
);

const NotFound = () => (
  <div className="text-center py-10">
    <h2 className="text-xl font-semibold">게시글을 찾을 수 없습니다.</h2>
    <p className="text-gray-600 mt-2">요청하신 게시글이 존재하지 않거나 삭제되었을 수 있습니다.</p>
  </div>
);

export default function GamePostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const fetchUserAndComments = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 댓글 데이터 불러오기
      try {
        const response = await fetch(`/api/game-posts/${id}/comments`);
        if(response.ok) {
          const commentsData = await response.json();
          setComments(commentsData);
        }
      } catch (error) {
        console.error("댓글 로딩 실패:", error);
      }
    };
    if (id) {
        fetchUserAndComments();
    }
  }, [id]);

  const {
    post,
    loading,
    error,
    submitting,
    isAuthor,
    isParticipating,
    isFull,
    handleDelete,
    handleCommentSubmit,
    handleDeleteComment,
    toggleParticipation,
    toggleRecruitment,
  } = useGamePostDetail({ postId: id as string });

  // 게시글 삭제 성공 핸들러
  const handleDeleteSuccess = () => {
    toast.success('게시글이 삭제되었습니다.');
    router.push('/game-mate');
  };

  // 게시글 수정 핸들러
  const handleEdit = () => {
    router.push(`/game-mate/${id}/edit`);
  };

  // 리더 위임 핸들러
  const handleTransferLeadership = (userId: string) => {
    // TODO: 리더 위임 로직 구현
    console.log('Transfer leadership to:', userId);
  };

  // 로딩 중 또는 에러 상태 처리
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorView error={error} />;
  if (!post) return <NotFound />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <GamePostHeader
        post={post}
        isAuthor={isAuthor}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onToggleStatus={toggleRecruitment}
        loading={submitting}
      />

      <div className="mt-6">
        <GamePostContent post={post} />
      </div>

      <div className="mt-8">
        <ParticipantList
          participants={post.participants}
          isLeader={isAuthor}
        />
      </div>

      <div className="mt-8">
        <CommentsSection
          comments={comments}
          currentUserId={user?.id || null}
          onSubmit={handleCommentSubmit}
          onDelete={handleDeleteComment}
          isSubmitting={false}
          error={null}
        />
      </div>

      {!isAuthor && (
        <div className="mt-8">
          {user ? (
            <ActionButtons
              isAuthor={false}
              loading={submitting}
              onSubmit={toggleParticipation}
              onToggleStatus={toggleRecruitment}
              isParticipating={isParticipating}
              isFull={isFull}
              status={post.status as 'OPEN' | 'FULL' | 'COMPLETED'}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">참여를 원하시면 로그인이 필요합니다.</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                로그인하기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
