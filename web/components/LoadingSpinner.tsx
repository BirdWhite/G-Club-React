interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = ({ className }: LoadingSpinnerProps) => {
  return (
    // 전체 화면을 덮는 로딩 컨테이너 - 최소 화면 높이, 중앙 정렬
    <div className={`flex items-center justify-center min-h-screen bg-cyber-black-200 ${className || ''}`}>
      {/* 로딩 콘텐츠 영역 */}
      <div className="text-center">
        {/* 회전하는 스피너 애니메이션 */}
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-blue mb-4"></div>
        {/* 로딩 메시지 텍스트 */}
        <p className="text-cyber-blue text-sm">로딩 중...</p>
      </div>
    </div>
  );
};
