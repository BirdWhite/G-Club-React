import { ReactNode } from 'react';

interface ProfileFormLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function ProfileFormLayout({ 
  title, 
  subtitle, 
  children, 
  maxWidth = 'md' 
}: ProfileFormLayoutProps) => {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  }[maxWidth];

  return (
    //전체 페이지 배경 컨테이너 - 최소 화면 높이, 패딩
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* 중앙 정렬된 폼 카드 컨테이너 */}
      <div className={`${maxWidthClass} mx-auto bg-card border border-border shadow-lg rounded-lg p-6`}>
        {/* 페이지 제목 영역 */}
        <div className="text-center mb-6">
          {/* 메인 타이틀 */}
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {/* 서브타이틀 (선택사항) */}
          {subtitle && (
            <p className="text-muted-foreground mt-2">{subtitle}</p>
          )}
        </div>
        {/* 폼 내용 영역 - 자식 컴포넌트들이 렌더링되는 곳 */}
        {children}
      </div>
    </div>
  );
};
