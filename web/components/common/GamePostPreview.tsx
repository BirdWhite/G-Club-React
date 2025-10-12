'use client';

import Link from 'next/link';
import { GamePostCard } from '@/components/game-mate/GamePostCard';
import { ChevronRight, Gamepad2 } from 'lucide-react';
import { useGamePostListSubscription } from '@/hooks/useRealtimeSubscription';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function GamePostPreview() {
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
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80 animate-pulse bg-muted rounded-lg h-48"></div>
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
            spaceBetween={16}
            slidesPerView={1}
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
            breakpoints={{
              640: {
                slidesPerView: 2,
              },
              1024: {
                slidesPerView: 3,
              },
              1280: {
                slidesPerView: 4,
              },
            }}
            loop={posts.length > 3}
            className="pb-12"
          >
            {posts.map((post) => (
              <SwiperSlide key={post.id}>
                <GamePostCard post={post} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
}
