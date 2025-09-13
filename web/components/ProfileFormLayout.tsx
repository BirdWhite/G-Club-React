import { ReactNode } from 'react';

interface ProfileFormLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const ProfileFormLayout = ({ 
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
    //전체 페이지 배경 컨테이너 - 최소 화면 높이, 사이버 테마 배경, 패딩
    <div className="min-h-screen bg-cyber-black-200 py-12 px-4 sm:px-6 lg:px-8">
      {/* 중앙 정렬된 폼 카드 컨테이너 */}
      <div className={`${maxWidthClass} mx-auto card p-6`}>
        {/* 페이지 제목 영역 */}
        <div className="text-center mb-6">
          {/* 메인 타이틀 */}
          <h1 className="text-3xl font-bold text-cyber-gray">{title}</h1>
          {/* 서브타이틀 (선택사항) */}
          {subtitle && (
            <p className="text-cyber-darkgray mt-2">{subtitle}</p>
          )}
        </div>
        {/* 폼 내용 영역 - 자식 컴포넌트들이 렌더링되는 곳 */}
        {children}
      </div>
    </div>
  );
};
