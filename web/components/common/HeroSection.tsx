
import { NoticePreview } from '@/components/common/NoticePreview';
import { GamePostPreview } from '@/components/common/GamePostPreview';

// 메인 페이지의 히어로 섹션 컴포넌트 (공지사항과 게임메이트 표시)
export function HeroSection() {
  return (
    <section className="h-full flex flex-col justify-start items-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-7xl space-y-6">
        {/* 공지사항 섹션 */}
        <div className="w-full">
          <NoticePreview />
        </div>
        
        {/* 게임메이트 섹션 */}
        <div className="w-full">
          <GamePostPreview />
        </div>
      </div>
    </section>
  );
};
