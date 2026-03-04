'use client';

import { useCallback } from 'react';
import { Share2 } from 'lucide-react';
import type { GamePost } from '@/types/models';
import toast from 'react-hot-toast';

interface KakaoShareButtonProps {
  post: GamePost;
}

function ensureKakaoInitialized(): boolean {
  const kakao = window.Kakao;
  if (!kakao) {
    return false;
  }
  if (!kakao.isInitialized()) {
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!jsKey) {
      return false;
    }
    kakao.init(jsKey);
  }
  return kakao.isInitialized();
}

export function KakaoShareButton({ post }: KakaoShareButtonProps) {
  const handleShare = useCallback(() => {
    if (!ensureKakaoInitialized()) {
      toast.error('카카오톡 공유 기능을 사용할 수 없습니다.');
      return;
    }

    const activeCount = post.participants?.filter(p => p.status === 'ACTIVE').length ?? 0;
    const baseUrl = window.location.origin;
    const postUrl = `${baseUrl}/game-mate/${post.id}`;
    const joinUrl = `${postUrl}?action=join`;

    const gameName = post.game?.name ?? post.customGameName ?? '';
    const title = `${post.title} ${activeCount}/${post.maxParticipants}`;
    const description = gameName
      ? `${gameName} | 얼티메이트`
      : '얼티메이트';

    const imageUrl = `${baseUrl}/icons/maskable_icon_x512.png`;

    window.Kakao!.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl,
        link: {
          webUrl: postUrl,
          mobileWebUrl: postUrl,
        },
      },
      buttons: [
        {
          title: '글 보기',
          link: {
            webUrl: postUrl,
            mobileWebUrl: postUrl,
          },
        },
        {
          title: '참여하기',
          link: {
            webUrl: joinUrl,
            mobileWebUrl: joinUrl,
          },
        },
      ],
    });
  }, [post]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground bg-transparent hover:underline focus:outline-none transition-colors duration-200"
      aria-label="카카오톡으로 공유"
    >
      <Share2 className="h-4 w-4" />
      <span>공유</span>
    </button>
  );
}
