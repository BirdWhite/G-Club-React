interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    // 전체 화면을 덮는 로딩 컨테이너 - 헤더를 제외한 높이, 중앙 정렬, 스크롤 방지
    <div className={`flex items-center justify-center h-full bg-background overflow-hidden ${className || ''}`}>
      {/* 로딩 콘텐츠 영역 */}
      <div className="text-center">
        {/* 회전하는 스피너 애니메이션 */}
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        {/* 로딩 메시지 텍스트 */}
        <p className="text-primary text-sm">로딩 중...</p>
      </div>
    </div>
  );
};
