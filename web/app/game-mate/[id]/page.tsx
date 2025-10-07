'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/database/supabase';
import { GamePost } from '@/types/models';
import { notFound } from 'next/navigation';
import { GamePostDetailClient } from '@/components/game-mate/GamePostDetailClient';
import { MobileGamePostDetailClient } from '@/components/game-mate/mobile/MobileGamePostDetailClient';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { User } from '@supabase/supabase-js';

type ExtendedUser = Omit<User, 'role'> & {
  role: string | null;
  profile?: {
    id: string;
    userId: string;
    name: string;
    birthDate: Date | null;
    image: string | null;
    role: {
      name: string;
    } | null;
  };
};

export default function GamePostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [post, setPost] = useState<GamePost | null>(null);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    const loadData = async () => {
      try {
        const { id } = await params;
        const [postResponse, userData] = await Promise.all([
          fetch(`/api/game-posts/${id}`),
          getCurrentUser()
        ]);

        if (!postResponse.ok) {
          notFound();
          return;
        }

        let postData;
        try {
          postData = await postResponse.json();
        } catch (jsonError) {
          console.error('JSON Parse Error:', jsonError);
          console.error('Response text:', await postResponse.text());
          notFound();
          return;
        }

        setPost(postData);
        setUser(userData);
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!post || !user) {
    notFound();
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <GamePostDetailClient initialPost={initialPostState} userId={userId} />
        </div>
      )}
    </>
  );
}
