'use client';

import { NoticePreview } from '@/components/common/NoticePreview';
import { NotificationPreview } from '@/components/common/NotificationPreview';
import { CalendarPreview } from '@/components/common/CalendarPreview';
import { GamePostPreview } from '@/components/common/GamePostPreview';
import { AuctionBanner } from '@/components/auction/AuctionBanner';

// 메인 페이지의 히어로 섹션 컴포넌트 (공지사항, 일정, 게임메이트, 알림 표시)
export function HeroSection() {
  return (
    <section className="h-full flex flex-col justify-start items-center page-content-padding py-8">
      <div className="w-full max-w-4xl space-y-6">
        <AuctionBanner />
        
        {/* PC: 1행 - 공지사항 + 일정 나란히 / 모바일: 세로 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="w-full min-w-0">
            <NoticePreview />
          </div>
          <div className="w-full min-w-0">
            <CalendarPreview />
          </div>
        </div>

        {/* 2행 - 게임메이트 */}
        <div className="w-full">
          <GamePostPreview />
        </div>

        {/* 3행 - 알림 */}
        <div className="w-full">
          <NotificationPreview />
        </div>
      </div>
    </section>
  );
}
