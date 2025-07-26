'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GamePost } from '@/types/models';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

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
  const [post, setPost] = useState(initialPost);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // router.refresh()를 호출하면 서버에서 데이터를 다시 가져오고
    // 이 컴포넌트의 initialPost prop이 업데이트됩니다.
    // 하지만, useState의 post는 자동으로 업데이트되지 않으므로
    // initialPost가 변경될 때마다 post 상태를 동기화해줍니다.
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    const channel = supabase
      .channel(`game_post:${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'GameParticipant',
          filter: `gamePostId=eq.${post.id}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${post.id}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, router, supabase]);

  const handleAction = async (action: () => Promise<Response>, successMessage: string, errorMessage: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const response = await action();
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || errorMessage);
      }
      
      toast.success(successMessage);
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParticipate = () => handleAction(
    () => fetch(`/api/game-posts/${post.id}/participate`, { method: 'POST' }),
    '참여 신청이 완료되었습니다.',
    '참여 신청 중 오류가 발생했습니다.'
  );

  const handleCancelParticipation = () => handleAction(
    () => fetch(`/api/game-posts/${post.id}/participate`, { method: 'DELETE' }),
    '참여가 취소되었습니다.',
    '참여 취소 중 오류가 발생했습니다.'
  );
  
  const handleWait = () => handleAction(
    () => fetch(`/api/game-posts/${post.id}/wait`, { method: 'POST' }),
    '예비 명단에 등록되었습니다.',
    '예비 명단 등록 중 오류가 발생했습니다.'
  );
  
  const handleDeletePost = () => {
    if (confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      handleAction(
        () => fetch(`/api/game-posts/${post.id}`, { method: 'DELETE' }),
        '게시글이 삭제되었습니다.',
        '게시글 삭제 중 오류가 발생했습니다.'
      ).then(() => {
        if (!isSubmitting) router.push('/game-mate');
      });
    }
  };

  const handleEditPost = () => {
    router.push(`/game-mate/${post.id}/edit`);
  };

  return (
    <>
      <GamePostHeader
        post={post}
        isOwner={!!post.isOwner}
        onDelete={handleDeletePost}
        onEdit={handleEditPost}
        loading={isSubmitting}
      />

      <div className="mt-6">
        <GamePostContent post={post} />
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">참여자 목록 ({post._count?.participants || 0}/{post.maxParticipants})</h3>
        <ParticipantList
          participants={post.participants}
          authorId={post.author.id}
        />
      </div>

      {post.waitingList && post.waitingList.length > 0 && (
         <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">예비 명단 ({post._count?.waitingList || 0}명)</h3>
            <WaitingList waitingList={post.waitingList} />
         </div>
      )}

      {!post.isOwner && userId && (
        <div className="mt-8">
          <ActionButtons
            postStatus={post.status}
            isParticipating={!!post.isParticipating}
            isWaiting={!!post.isWaiting}
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