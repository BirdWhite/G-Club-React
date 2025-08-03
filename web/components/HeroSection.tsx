import { FC } from 'react';
import Link from 'next/link';
import { NoticeSection } from './NoticeSection';

interface HeroSectionProps {
  onStartClick?: () => void;
  onLearnMoreClick?: () => void;
}

// 메인 페이지의 히어로 섹션 컴포넌트
export const HeroSection = ({ onStartClick, onLearnMoreClick }: HeroSectionProps) => {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* 메인 콘텐츠 카드 */}
      <div className="rounded-2xl p-8 bg-[#111113] border border-[#1e1e24] shadow-2xl">
        <div className="h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-cyber-gray mb-6 leading-tight">
            Ultimate에 오신 것을<br />환영합니다
          </h1>
          <p className="text-xl text-cyber-gray/80 mb-8 max-w-2xl">
            게이머들을 위한 최고의 커뮤니티에서 함께하세요. 실력 향상, 팀원 모집, 게임 정보 공유까지 한 곳에서!
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onStartClick}
              className="px-8 py-3 rounded-xl text-lg font-semibold bg-cyber-blue text-cyber-black hover:bg-[#0ea5e9] transition-all transform hover:-translate-y-0.5 shadow-lg shadow-cyber-blue/30 hover:shadow-cyber-blue/50"
            >
              시작하기
            </button>
            <button 
              onClick={onLearnMoreClick}
              className="px-8 py-3 rounded-xl text-lg font-semibold border-2 border-cyber-blue/50 text-cyber-blue hover:bg-cyber-blue/5 hover:border-cyber-blue transition-all transform hover:-translate-y-0.5"
            >
              더 알아보기
            </button>
          </div>
        </div>
      </div>

      {/* 공지사항 섹션 */}
      {/* <NoticeSection /> */}
    </section>
  );
};
