import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/database/prisma';
import { createServerClient } from '@/lib/database/supabase';
import { getUserProfile } from '@/lib/user';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';
import { Shield, Plus, Gamepad2, Zap, Trophy, TrendingUp } from 'lucide-react';
import { getUserValorantTier } from '@/lib/valorant/valorantTier';

// 티어 색상 맵
function getTierColor(tier: string | null | undefined): string {
  if (!tier) return 'text-slate-400';
  const t = tier.toUpperCase();
  if (t.includes('RADIANT')) return 'text-yellow-300';
  if (t.includes('IMMORTAL')) return 'text-red-400';
  if (t.includes('ASCENDANT')) return 'text-emerald-400';
  if (t.includes('DIAMOND')) return 'text-blue-400';
  if (t.includes('PLATINUM')) return 'text-cyan-400';
  if (t.includes('GOLD')) return 'text-yellow-500';
  if (t.includes('SILVER')) return 'text-slate-300';
  if (t.includes('BRONZE')) return 'text-orange-600';
  if (t.includes('IRON')) return 'text-slate-500';
  return 'text-slate-400';
}

function getTierBg(tier: string | null | undefined): string {
  if (!tier) return 'from-slate-800 to-slate-900';
  const t = tier.toUpperCase();
  if (t.includes('RADIANT')) return 'from-yellow-900/40 to-slate-900';
  if (t.includes('IMMORTAL')) return 'from-red-900/40 to-slate-900';
  if (t.includes('ASCENDANT')) return 'from-emerald-900/40 to-slate-900';
  if (t.includes('DIAMOND')) return 'from-blue-900/40 to-slate-900';
  if (t.includes('PLATINUM')) return 'from-cyan-900/40 to-slate-900';
  if (t.includes('GOLD')) return 'from-yellow-900/40 to-slate-900';
  if (t.includes('SILVER')) return 'from-slate-700/40 to-slate-900';
  if (t.includes('BRONZE')) return 'from-orange-900/40 to-slate-900';
  if (t.includes('IRON')) return 'from-stone-800/40 to-slate-900';
  return 'from-slate-800 to-slate-900';
}

export default async function ValorantHubPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect('/profile/register');
  }

  const adminUser = isAdmin_Server(profile.role);

  const accounts = await prisma.valorantAccount.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [
      { isActive: 'desc' },
      { gameName: 'asc' },
    ],
  });

  // 내전 티어 및 MMR 정보 조회
  const internalTierInfo = await getUserValorantTier(user.id);

  // 티어 라벨 및 색상 (G-Club 전용)
  const getInternalTierLabel = (tier: string) => {
    if (tier === 'unplaced') return { label: '배치 중', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    return { 
      label: `Tier ${tier}`, 
      color: tier === '0' ? 'text-yellow-400' : tier === '1' ? 'text-red-400' : tier === '2' ? 'text-emerald-400' : 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    };
  };

  const tierDisplay = internalTierInfo ? getInternalTierLabel(internalTierInfo.tier) : null;

  return (
    <div className="min-h-full bg-background">
      {/* 헤더 */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
        {/* 배경 장식 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
                  <Gamepad2 className="w-6 h-6 text-indigo-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  내전 기록실
                </h1>
              </div>
              <p className="text-slate-400 text-sm">
                연결된 계정을 통해 내전 기록과 통계를 확인하세요.
              </p>
            </div>

            {/* 관리자 버튼 - 관리자에게만 표시 */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Link
                href="/valorant/leaderboard"
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 hover:border-indigo-500/60 rounded-lg text-indigo-400 font-semibold text-sm transition-all duration-200 group"
              >
                <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                순위표
              </Link>
              
              {adminUser && (
                <Link
                  href="/valorant/admin"
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-500/60 rounded-lg text-amber-400 font-semibold text-sm transition-all duration-200 group"
                >
                  <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  관리
                </Link>
              )}
            </div>
          </div>

          {/* 내전 MMR 요약 카드 (추가) */}
          {internalTierInfo && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-full ${tierDisplay?.bg} ${tierDisplay?.border} border-2 flex items-center justify-center shadow-lg shadow-indigo-900/20`}>
                    {internalTierInfo.tier === 'unplaced' ? (
                      <TrendingUp className="w-10 h-10 text-slate-500" />
                    ) : (
                      <span className={`text-4xl font-black ${tierDisplay?.color}`}>{internalTierInfo.tier}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">G-Club Internal Rank</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${tierDisplay?.bg} ${tierDisplay?.color} border ${tierDisplay?.border}`}>
                        {tierDisplay?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <div className="text-xs font-bold text-slate-500 mb-1">Tracker Score</div>
                        <div className="text-3xl font-black text-indigo-400 flex items-baseline gap-2">
                          {internalTierInfo.trackerScore || 0}
                          <span className="text-sm font-medium text-indigo-400/50">pts</span>
                        </div>
                      </div>
                      
                      <div className="w-px h-10 bg-white/10" />

                      <div className="flex flex-col">
                        <div className="text-xs font-bold text-slate-500 mb-1">Internal MMR</div>
                        <div className="text-3xl font-black text-white flex items-baseline gap-2">
                          {internalTierInfo.mmr}
                          <span className="text-sm font-medium text-slate-500 uppercase tracking-tighter">mmr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-500 mb-1">참여 횟수</div>
                  <div className="text-xl font-bold text-white">{internalTierInfo.matchCount} <span className="text-sm text-slate-500">matches</span></div>
                  {internalTierInfo.matchCount < 5 && (
                    <div className="text-[10px] text-indigo-400 mt-1 font-medium">배치 완료까지 {5 - internalTierInfo.matchCount}판 남음</div>
                  )}
                </div>
              </div>
              
              <div className="p-6 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 backdrop-blur-md flex flex-col justify-center">
                <div className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Status
                </div>
                <p className="text-white text-sm font-medium leading-relaxed">
                  {internalTierInfo.tier === 'unplaced' 
                    ? '아직 배치 중입니다. 5판 이상의 공식 내전에 참여하여 티어를 획득하세요!' 
                    : `상위 백분위 기준 Tier ${internalTierInfo.tier}에 배정되었습니다. 더 높은 곳을 향해 도전하세요!`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {accounts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/10 flex items-center justify-center border border-indigo-500/20">
                <Gamepad2 className="w-14 h-14 text-indigo-500/60" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              연결된 발로란트 계정이 없습니다
            </h2>
            <p className="text-slate-400 max-w-md leading-relaxed mb-8">
              본캐와 부캐를 등록하고 내전 기록을 관리해 보세요! 여러 계정을 등록하면 통합된 통계를 확인할 수 있어요.
            </p>
            <Link
              href="/valorant/register"
              className="flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/60 transition-all duration-200 hover:scale-105 active:scale-95 text-lg"
            >
              <Plus className="w-5 h-5" />
              발로란트 계정 연결하기
            </Link>
          </div>
        ) : (
          <>
            {/* 계정 목록 섹션 */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                내 계정 ({accounts.length}개)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Link
                  key={account.puuid}
                  href={`/valorant/profile/${account.puuid}`}
                  className="group relative block"
                >
                  <div className={`relative overflow-hidden rounded-2xl border border-slate-700/60 hover:border-indigo-500/50 bg-gradient-to-br ${getTierBg(account.currentTier)} p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-1 cursor-pointer`}>
                    
                    {/* 주력 계정 배지 */}
                    {account.isActive && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-indigo-600/80 backdrop-blur-sm rounded-full border border-indigo-400/30">
                        <Zap className="w-2.5 h-2.5 text-indigo-200" />
                        <span className="text-[10px] text-indigo-100 font-bold tracking-wide">주력</span>
                      </div>
                    )}

                    {/* 배경 장식 원 */}
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full -mr-12 -mb-12 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-0 left-0 w-20 h-20 bg-white/[0.02] rounded-full -ml-8 -mt-8" />

                    <div className="relative">
                      {/* 아바타 이니셜 */}
                      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-4 group-hover:border-indigo-500/40 transition-colors">
                        <span className="text-lg font-extrabold text-white">
                          {account.gameName.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* 닉네임 & 태그 */}
                      <div className="mb-3">
                        <div className="font-extrabold text-lg text-white leading-tight truncate group-hover:text-indigo-200 transition-colors">
                          {account.gameName}
                        </div>
                        <div className="text-slate-500 text-sm font-medium">
                          #{account.tagLine}
                        </div>
                      </div>

                      {/* 티어 */}
                      <div className={`text-sm font-bold ${getTierColor(account.currentTier)} flex items-center gap-1.5`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${account.currentTier ? 'bg-current' : 'bg-slate-600'}`} />
                        {account.currentTier || 'Unranked'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* 계정 추가 카드 */}
              <Link
                href="/valorant/register"
                className="group block"
              >
                <div className="h-full min-h-[160px] rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-indigo-950/20 flex flex-col items-center justify-center gap-3 p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-indigo-600/20 border border-slate-700 group-hover:border-indigo-500/50 flex items-center justify-center transition-all duration-300">
                    <Plus className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-500 group-hover:text-indigo-300 transition-colors">
                      새로운 발로란트 계정 연결하기
                    </div>
                    <div className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5">
                      본캐 · 부캐 모두 등록 가능
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
