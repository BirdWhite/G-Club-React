'use client';

import { NoticePreview } from '@/components/common/NoticePreview';
import { NotificationPreview } from '@/components/common/NotificationPreview';
import { GamePostPreview } from '@/components/common/GamePostPreview';

// 메인 페이지의 히어로 섹션 컴포넌트 (공지사항, 알림, 게임메이트 표시)
export function HeroSection() {
  return (
    <section className="flex flex-col justify-start items-center px-8 sm:px-10 lg:px-12 py-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* PC: 1행 - 공지사항 + 알림 나란히 / 모바일: 세로 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="w-full min-w-0">
            <NoticePreview />
          </div>
          <div className="w-full min-w-0">
            <NotificationPreview />
          </div>
        </div>

        {/* 2행 - 게임메이트 */}
        <div className="w-full">
          <GamePostPreview />
        </div>
      </div>
    </section>
  );
}
