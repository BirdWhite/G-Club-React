'use client';

import Link from 'next/link';
import { GamePostCard } from '@/components/game-mate/GamePostCard';
import { ChevronRight, Gamepad2 } from 'lucide-react';
import { useGamePostListSubscription } from '@/hooks/useRealtimeSubscription';
import { useProfile } from '@/contexts/ProfileProvider';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function GamePostPreview() {
  const { profile } = useProfile();
  // 실시간 구독 훅 사용 (모집 중인 글만)
  const { posts: allPosts, loading: isLoading } = useGamePostListSubscription({ 
    status: 'OPEN',
    limit: 10  // 여유있게 10개 가져오기
  });

  // 최대 10개 표시
  const posts = allPosts.slice(0, 10);

  if (isLoading) {
    return (
      <div className="px-0 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/game-mate"
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
          >
            <Gamepad2 className="w-5 h-5" />
            게임메이트
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="flex gap-6 overflow-x-auto overflow-y-hidden pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-full md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] animate-pulse bg-muted rounded-lg h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-0 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/game-mate"
          className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
        >
          <Gamepad2 className="w-5 h-5" />
          게임메이트
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-6">
          <Gamepad2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">모집 중인 게임메이트가 없습니다</p>
        </div>
      ) : (
        <div className="game-post-swiper-container">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={24}
            slidesPerView="auto"
            navigation={{
              prevEl: '.game-post-swiper-button-prev',
              nextEl: '.game-post-swiper-button-next',
            }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            loop={posts.length > 3}
            className="pb-12"
          >
            {posts.map((post) => (
              <SwiperSlide key={post.id} className="!w-full md:!w-[calc((100%-1.5rem)/2)] lg:!w-[calc((100%-3rem)/3)] flex-shrink-0">
                <GamePostCard post={post} currentUserId={profile?.userId} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
}
