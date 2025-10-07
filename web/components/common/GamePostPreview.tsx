'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { GamePostCard } from '@/components/game-mate/GamePostCard';
import { ChevronRight, ChevronLeft, Gamepad2 } from 'lucide-react';
import type { GamePost } from '@/types/models';

interface GamePostResponse {
  success: boolean;
  posts: GamePost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function GamePostPreview() {
  const [posts, setPosts] = useState<GamePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightFadeOpacity, setRightFadeOpacity] = useState(1);
  const [leftFadeOpacity, setLeftFadeOpacity] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 게임메이트 글 목록 조회 (모집 중인 최신 3개)
  const fetchGamePosts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '5',
        status: 'OPEN' // 모집 중인 글만
      });

      const response = await fetch(`/api/game-posts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(`서버 오류 (${response.status}): ${errorData.error || '알 수 없는 오류'}`);
        return;
      }
      
      const data: GamePostResponse = await response.json();

      if (data.success) {
        setPosts(data.posts);
        setError(null);
      } else {
        setError('게임메이트 글을 불러오는데 실패했습니다');
      }
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGamePosts();
  }, []);

  // 스크롤 이벤트 감지하여 현재 인덱스 업데이트
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const cardWidth = 320 + 16; // w-80 (320px) + gap-4 (16px)
      const scrollLeft = container.scrollLeft;
      // const newIndex = Math.round(scrollLeft / cardWidth); // 현재 미사용
 
      
      // 오른쪽 페이드 투명도 계산
      const actualMaxScroll = container.scrollWidth - container.clientWidth;
      
      if (posts.length <= 3) {
        // 3개 이하면 스크롤할 필요가 없으므로 페이드 숨김
        setRightFadeOpacity(0);
      } else if (scrollLeft >= actualMaxScroll - 10) {
        // 실제 스크롤 끝에 도달하면 오른쪽 페이드 완전히 숨김
        setRightFadeOpacity(0);
      } else if (scrollLeft >= actualMaxScroll - cardWidth) {
        // 마지막 카드가 보이기 시작하면 오른쪽 페이드를 점진적으로 사라지게 함
        const fadeProgress = (scrollLeft - (actualMaxScroll - cardWidth)) / cardWidth;
        const newOpacity = Math.max(0, 1 - fadeProgress);
        setRightFadeOpacity(newOpacity);
      } else {
        setRightFadeOpacity(1);
      }
      
      // 왼쪽 페이드 투명도 계산
      if (scrollLeft > 0) {
        // 스크롤이 시작되면 왼쪽 페이드가 나타남
        const leftFadeProgress = Math.min(scrollLeft / cardWidth, 1);
        setLeftFadeOpacity(leftFadeProgress);
      } else {
        setLeftFadeOpacity(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [posts.length]);

  // 캐러셀 네비게이션 함수들 (현재 미사용)
  // const scrollToIndex = (index: number) => {
  //   if (scrollContainerRef.current) {
  //     const container = scrollContainerRef.current;
  //     const cardWidth = 320 + 16; // w-80 (320px) + gap-4 (16px)
  //     container.scrollTo({
  //       left: index * cardWidth,
  //       behavior: 'smooth'
  //     });
  //   }
  // };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 320 + 16; // w-80 (320px) + gap-4 (16px)
      const currentScroll = container.scrollLeft;
      
      // 현재 보이는 첫 번째 카드의 인덱스 계산
      const currentCardIndex = Math.round(currentScroll / cardWidth);
      
      // 이전 카드로 이동 (한 카드씩)
      const targetIndex = Math.max(currentCardIndex - 1, 0);
      const targetScroll = targetIndex * cardWidth;
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 320 + 16; // w-80 (320px) + gap-4 (16px)
      const maxScroll = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      // 현재 보이는 첫 번째 카드의 인덱스 계산
      const currentCardIndex = Math.round(currentScroll / cardWidth);
      
      // 다음 카드로 이동 (한 카드씩)
      const targetIndex = currentCardIndex + 1;
      const targetScroll = Math.min(targetIndex * cardWidth, maxScroll);
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  // 드래그 기능
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftStart(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeftStart - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
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

  if (error) {
    return (
      <div className="p-6">
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
        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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
        <div className="relative">
          {/* 좌측 화살표 */}
          {leftFadeOpacity > 0 && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {/* 우측 화살표 */}
          {rightFadeOpacity > 0 && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border border-border rounded-full p-2 shadow-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          
          {/* 캐러셀 컨테이너 */}
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex-shrink-0 w-80 snap-start"
                >
                  <GamePostCard post={post} />
                </div>
              ))}
            </div>
            
            {/* 그라데이션 오버레이 (좌측 페이드) - 동적 투명도 */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none transition-opacity duration-50"
              style={{ opacity: leftFadeOpacity }}
            ></div>
            
            {/* 그라데이션 오버레이 (우측 페이드) - 동적 투명도 */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none transition-opacity duration-50"
              style={{ opacity: rightFadeOpacity }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
