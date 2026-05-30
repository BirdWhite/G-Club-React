'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileProvider';
import { Gamepad2, Trophy, Flame, PlusCircle, UserCog } from 'lucide-react';
import { getDashboardData } from '@/actions/dashboard';

interface DashboardStats {
  gamePostCount: number;
  isAuctionActive: boolean;
  myCompletedMatchesCount: number;
}

export function ClubDashboard() {
  const { profile } = useProfile();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    getDashboardData().then(res => {
      if (res.success && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    });
  }, [profile]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-1 text-left">
          <div className="h-8 bg-muted animate-pulse rounded w-1/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3 mt-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = profile?.name || '부원';
  
  const showGamePostCard = stats && stats.gamePostCount > 0;
  const showAuctionCard = stats && stats.isAuctionActive;
  const showMatchesCard = stats !== null;

  const visibleCardsCount = (showGamePostCard ? 1 : 0) + (showAuctionCard ? 1 : 0) + (showMatchesCard ? 1 : 0);

  return (
    <div className="w-full space-y-6">
      {/* 웰컴 문구 */}
      <div className="flex flex-col gap-1 text-left">
        <h2 className="text-2xl font-bold text-foreground">
          반가워요, <span className="text-primary">{displayName}</span>님!
        </h2>
        <p className="text-sm text-muted-foreground">
          오늘 얼티메이트에서 올라온 소식들을 확인하고 동아리원들과 같이 게임을 즐겨보세요.
        </p>
      </div>

      {/* 활동 요약 위젯 */}
      {visibleCardsCount > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${
          visibleCardsCount === 3 
            ? 'sm:grid-cols-3' 
            : visibleCardsCount === 2 
              ? 'sm:grid-cols-2' 
              : 'w-full'
        }`}>
          {/* 요약 카드 1: 모집 중인 게임메이트 (OPEN > 0 일때만 표시) */}
          {showGamePostCard && (
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl transition-all duration-200 ease-in-out hover:border-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs text-muted-foreground font-semibold">모집 중인 게임메이트</span>
                  <p className="text-lg font-bold text-foreground leading-tight">{stats.gamePostCount}개</p>
                </div>
              </div>
            </div>
          )}

          {/* 요약 카드 2: 이번 달 완료 매치 참여 (항상 표시) */}
          {showMatchesCard && (
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl transition-all duration-200 ease-in-out hover:border-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyber-purple/10 text-cyber-purple flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs text-muted-foreground font-semibold">이번 달 완료 매치 참여</span>
                  <p className="text-lg font-bold text-foreground leading-tight">{stats.myCompletedMatchesCount}개</p>
                </div>
              </div>
            </div>
          )}

          {/* 요약 카드 3: 진행 중인 대회 경매 (활성화시에만 표시) */}
          {showAuctionCard && (
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl transition-all duration-200 ease-in-out hover:border-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyber-orange/10 text-cyber-orange flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs text-muted-foreground font-semibold">진행 중인 대회 경매</span>
                  <p className="text-lg font-bold text-foreground leading-tight">활성화</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3번: 동아리 퀵 액션 */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block text-left">
          퀵 메뉴
        </span>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/game-mate/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary hover:bg-muted/10 transition-all duration-200 ease-in-out cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-primary" />
            <span>같이 게임할 사람 구하기</span>
          </Link>
          <Link
            href="/valorant"
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary hover:bg-muted/10 transition-all duration-200 ease-in-out cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-cyber-orange" />
            <span>내전 기록실 확인</span>
          </Link>
          <Link
            href="/profile/edit"
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary hover:bg-muted/10 transition-all duration-200 ease-in-out cursor-pointer"
          >
            <UserCog className="w-4 h-4 text-cyber-gray" />
            <span>프로필 편집</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
