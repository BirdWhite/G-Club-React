'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GamePostForm } from '@/components/game-mate/GamePostForm';
import { MobileGamePostForm } from '@/components/game-mate/mobile/MobileGamePostForm';
import { GamePost } from '@/types/models';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function EditGamePostPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [post, setPost] = useState<GamePost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/game-posts/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/404');
            return;
          }
          throw new Error('게시글을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-12">
        <div className="w-full max-w-4xl">
        <div className="bg-card border border-border shadow-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">오류 발생</h1>
          <p className="text-muted-foreground">{error || '게시글을 찾을 수 없습니다.'}</p>
        </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return <MobileGamePostForm initialData={post} />;
  }

  return (
    <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-12">
        <div className="w-full max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">모집글 수정하기</h1>
        <p className="mt-2 text-sm text-muted-foreground">게시글 내용을 수정하고 다시 파티원을 모집해보세요.</p>
      </div>
      <div className="bg-card border border-border shadow-lg rounded-lg p-6 sm:p-8">
        <GamePostForm initialData={post} />
      </div>
        </div>
      </div>
  );
}