'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/database/supabase';
import { ExtendedUser } from '@/lib/database/supabase/auth';
import { GamePost, GameParticipant } from '@/types/models';
import { GamePostDetailClient } from '@/components/game-mate/GamePostDetailClient';
import { MobileGamePostDetailClient } from '@/components/game-mate/mobile/MobileGamePostDetailClient';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DeletedGamePostMessage } from '@/components/game-mate/DeletedGamePostMessage';
import toast from 'react-hot-toast';

// 로컬 ExtendedUser 정의 삭제됨

export default function GamePostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [post, setPost] = useState<GamePost | null>(null);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { id } = await params;
        const [postResponse, userData] = await Promise.all([
          fetch(`/api/game-posts/${id}`),
          getCurrentUser()
        ]);

        if (!postResponse.ok) {
          if (postResponse.status === 410) {
            setIsDeleted(true);
            return;
          }
          if (postResponse.status === 404) {
            router.replace('/game-mate');
            return;
          }
          throw new Error('게시글을 불러올 수 없습니다.');
        }

        let postData;
        try {
          postData = await postResponse.json();
        } catch (jsonError) {
          console.error('JSON Parse Error:', jsonError);
          toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
          router.replace('/game-mate');
          return;
        }

        if (!userData) {
          router.replace('/auth/login');
          return;
        }

        setPost(postData);
        setUser(userData);

        if (
          searchParams.get('action') === 'join' &&
          !autoJoinAttempted.current
        ) {
          autoJoinAttempted.current = true;
          const isAlreadyParticipating = postData.participants?.some(
            (p: GameParticipant) => p.userId === userData.id && p.status === 'ACTIVE'
          );
          const isAuthor = userData.id === postData.author?.userId;
          const isOpen = postData.status === 'OPEN' || postData.status === 'IN_PROGRESS';

          if (!isAlreadyParticipating && !isAuthor && isOpen) {
            try {
              const joinRes = await fetch(`/api/game-posts/${id}/participate`, { method: 'POST' });
              if (joinRes.ok) {
                toast.success('게임 참여가 완료되었습니다.');
              } else {
                const joinData = await joinRes.json().catch(() => ({}));
                if (joinRes.status !== 409) {
                  toast.error((joinData as { error?: string }).error ?? '참여 처리 중 오류가 발생했습니다.');
                }
              }
            } catch {
              toast.error('참여 처리 중 오류가 발생했습니다.');
            }
          }
          router.replace(`/game-mate/${id}`, { scroll: false });
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        toast.error('게시글을 불러올 수 없습니다.');
        router.replace('/game-mate');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params, router, searchParams]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isDeleted) {
    return (
      <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
        <div className="w-full max-w-4xl">
          <DeletedGamePostMessage />
        </div>
      </div>
    );
  }

  if (!post || !user) {
    return <LoadingSpinner />; // 리다이렉트 중일 수 있음
  }

  const userId = user?.id;
  const isOwner = userId === post.author.userId;
  const isParticipating = post.participants?.some(p => p.userId === userId && p.status === 'ACTIVE');
  const isWaiting = post.waitingList?.some(w => w.userId === userId && w.status !== 'CANCELED');

  const initialPostState = {
    ...post,
    isOwner,
    isParticipating,
    isWaiting,
  };

  return (
    <>
      {isMobile ? (
        <MobileGamePostDetailClient initialPost={initialPostState} userId={userId} />
      ) : (
        <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
          <div className="w-full max-w-4xl">
          <GamePostDetailClient initialPost={initialPostState} userId={userId} />
          </div>
        </div>
      )}
    </>
  );
}
