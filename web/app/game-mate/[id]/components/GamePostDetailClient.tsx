'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GamePost, GameParticipant, WaitingParticipant } from '@/types/models';
import toast from 'react-hot-toast';
import { useGamePostDetailSubscription } from '@/hooks/useRealtimeSubscription';

import GamePostHeader from '@/app/game-mate/components/GamePostHeader';
import GamePostContent from '@/app/game-mate/components/GamePostContent';
import ParticipantList from '@/app/game-mate/components/ParticipantList';
import WaitingList from '@/app/game-mate/components/WaitingList';
import ActionButtons from '@/app/game-mate/components/ActionButtons';

interface GamePostDetailClientProps {
  initialPost: GamePost;
  userId?: string;
}

export default function GamePostDetailClient({ initialPost, userId }: GamePostDetailClientProps) {
  const router = useRouter();
  const { post, loading: isSubmitting, refresh } = useGamePostDetailSubscription(initialPost.id, initialPost);
  
  const currentPost = post || initialPost;

  const handleAction = async (action: () => Promise<Response>, successMessage: string, errorMessage: string) => {
    if (isSubmitting) return;
    
    try {
      const response = await action();
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || errorMessage);
      }
      
      toast.success(successMessage);
      refresh(); // Re-fetch data using the hook's method

    } catch (error: any) {
      toast.error(error.message || errorMessage);
    }
  };

  const handleParticipate = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/participate`, { method: 'POST' }),
    '참여 신청이 완료되었습니다.',
    '참여 신청 중 오류가 발생했습니다.'
  );

  const handleCancelParticipation = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/participate`, { method: 'DELETE' }),
    '참여가 취소되었습니다.',
    '참여 취소 중 오류가 발생했습니다.'
  );
  
  const handleWait = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/wait`, { method: 'POST' }),
    '예비 명단에 등록되었습니다.',
    '예비 명단 등록 중 오류가 발생했습니다.'
  );
  
  const handleDeletePost = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/game-posts/${currentPost.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '게시글 삭제 중 오류가 발생했습니다.');
      }
      
      toast.success('게시글이 삭제되었습니다.');
      router.push('/game-mate');

    } catch (error: any) {
      toast.error(error.message || '게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditPost = () => {
    router.push(`/game-mate/${currentPost.id}/edit`);
  };

  const isOwner = currentPost.isOwner; // Use server-provided value
  const isParticipating = currentPost.participants?.some((p: GameParticipant) => p.userId === userId);
  const isWaiting = currentPost.waitingList?.some((w: WaitingParticipant) => w.userId === userId);

  return (
    <>
      <GamePostHeader
        post={currentPost}
        isOwner={isOwner}
        onDelete={handleDeletePost}
        onEdit={handleEditPost}
        loading={isSubmitting}
      />

      <div className="mt-6">
        <GamePostContent post={currentPost} />
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">참여자 목록 ({currentPost._count?.participants || 0}/{currentPost.maxParticipants})</h3>
        <ParticipantList
          participants={currentPost.participants}
          authorId={currentPost.author.id}
        />
      </div>

      {currentPost.waitingList && currentPost.waitingList.length > 0 && (
         <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">예비 명단 ({currentPost._count?.waitingList || 0}명)</h3>
            <WaitingList waitingList={currentPost.waitingList} />
         </div>
      )}

      {!isOwner && userId && (
        <div className="mt-8">
          <ActionButtons
            postStatus={currentPost.status}
            isParticipating={isParticipating}
            isWaiting={isWaiting}
            onParticipate={handleParticipate}
            onCancelParticipation={handleCancelParticipation}
            onWait={handleWait}
            loading={isSubmitting}
          />
        </div>
      )}
    </>
  );
}
 