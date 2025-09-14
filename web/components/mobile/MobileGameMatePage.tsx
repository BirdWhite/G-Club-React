'use client';

import { useRouter } from 'next/navigation';
import MobileGamePostList from '@/app/game-mate/components/mobile/MobileGamePostList';

interface MobileGameMatePageProps {
  userId: string;
}

export default function MobileGameMatePage({ userId }: MobileGameMatePageProps) {
  const router = useRouter();

  const handleNewPostClick = () => {
    router.push('/game-mate/new');
  };

  return (
    <div className="h-full bg-cyber-black-200 overflow-y-auto scrollbar-visible relative">
      {/* 모바일용 콘텐츠 */}
      <main className="px-4 py-6">
        <MobileGamePostList userId={userId} />
      </main>
      
      {/* 플로팅 액션 버튼 - 하단 네비게이션바 위에 위치 */}
      <button
        onClick={handleNewPostClick}
        className="fixed bottom-24 right-6 w-14 h-14 bg-cyber-blue hover:bg-cyber-blue/90 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-center z-50 transform hover:scale-105"
        style={{
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        aria-label="새 모집글 작성"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
