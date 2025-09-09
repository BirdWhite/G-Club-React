import { getCurrentUser } from '@/lib/supabase/auth';
import GamePostList from '@/app/game-mate/components/GamePostList';

export default async function GameMatePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-cyber-black-200">
      <div className="bg-cyber-black-100 border-b border-cyber-black-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-cyber-gray">게임메이트 찾기</h1>
          <p className="mt-1 text-sm text-cyber-gray/60">함께 게임을 즐길 파티원을 찾아보세요!</p>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <GamePostList userId={user?.id} />
      </main>
    </div>
  );
}
