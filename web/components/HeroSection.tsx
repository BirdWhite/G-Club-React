interface HeroSectionProps {
  onStartClick?: () => void;
  onLearnMoreClick?: () => void;
}

// 메인 페이지의 히어로 섹션 컴포넌트
export const HeroSection = ({ onStartClick, onLearnMoreClick }: HeroSectionProps) => {
  return (
    // 히어로 섹션 컨테이너 - 최소 높이 설정, 중앙 정렬, 배경 그라데이션
    <div className="min-h-screen bg-background">
      {/* 히어로 콘텐츠 컨테이너 - 중앙 정렬, 텍스트 중심 */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* 메인 타이틀 */}
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            G Club에 오신 것을 환영합니다
          </h1>
          {/* 서브 타이틀 설명 */}
          <p className="text-xl text-gray-600 mb-8">
            더 나은 미래를 위한 첫 걸음을 시작하세요
          </p>
          {/* 버튼 그룹 */}
          <div className="space-x-4">
            {/* 시작하기 버튼 */}
            <button 
              onClick={onStartClick}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              시작하기
            </button>
            {/* 더 알아보기 버튼 */}
            <button 
              onClick={onLearnMoreClick}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              더 알아보기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
