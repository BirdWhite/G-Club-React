import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/database/prisma';
import { createServerClient } from '@/lib/database/supabase';
import { getUserProfile } from '@/lib/user';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';
import { Shield, Plus, Gamepad2, Zap, Trophy } from 'lucide-react';
import { getUserValorantTier } from '@/lib/valorant/valorantTier';
import { TrackerScoreBadge } from '@/components/valorant/TrackerScoreBadge';

// 티어 색상 맵 (Riot 티어 기준)
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

// 서비스 가이드라인에 따른 티어 라벨 정보 (G-Club 전용)

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
      color: tier === '0' ? 'text-yellow-400' : tier === '1' ? 'text-red-400' : tier === '2' ? 'text-emerald-400' : 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20'
    };
  };

  const tierDisplay = internalTierInfo ? getInternalTierLabel(internalTierInfo.tier) : null;

  return (
    <div className="min-h-full bg-background">
      {/* 헤더 세션 */}
      <div className="flex flex-col items-center page-content-padding py-10">
        <div className="w-full max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  내전 기록실
                </h1>
              </div>
              <p className="text-muted-foreground text-sm">
                연결된 계정을 통해 내전 기록과 통계를 확인하세요.
              </p>
            </div>

            {/* 상단 버튼군 */}
            <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
              {adminUser && (
                <Link
                  href="/valorant/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-500/60 rounded-lg text-amber-400 font-semibold text-sm transition-all duration-200 group"
                >
                  <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  관리
                </Link>
              )}

              <Link
                href="/valorant/leaderboard"
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-semibold text-sm group"
              >
                <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                순위표
              </Link>
            </div>
          </div>

          {/* 내전 MMR 요약 카드 */}
          {internalTierInfo && (
            <div className="mt-8">
              <div className="p-5 sm:p-6 card">
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* 트래커 점수 원형 프로그레스 바 (뱃지) */}
                  <TrackerScoreBadge 
                    score={internalTierInfo.trackerScore || 0} 
                    size="md" 
                    className="flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">내전 티어</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${tierDisplay?.bg} ${tierDisplay?.color} border ${tierDisplay?.border}`}>
                          {tierDisplay?.label}
                        </span>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <div className="px-1.5 py-0.5 bg-secondary/40 rounded text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                          {internalTierInfo.matchCount} 매치
                        </div>
                        {internalTierInfo.matchCount < 5 && (
                          <div className="text-[8px] text-primary font-medium italic mt-0.5 whitespace-nowrap leading-none">
                            배치 중
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-8">
                      <div className="flex flex-col items-start">
                        <div className="text-[10px] sm:text-xs font-bold text-muted-foreground mb-1 whitespace-nowrap">트래커 점수</div>
                        <div className="text-xl sm:text-3xl font-black text-primary flex items-baseline gap-1">
                          {internalTierInfo.trackerScore || 0}
                          <span className="text-[10px] sm:text-sm font-medium text-primary/50">pts</span>
                        </div>
                      </div>

                      <div className="w-px h-8 bg-border/60" />

                      <div className="flex flex-col items-start">
                        <div className="text-[10px] sm:text-xs font-bold text-muted-foreground mb-1 whitespace-nowrap">내전 MMR</div>
                        <div className="text-xl sm:text-3xl font-black text-foreground flex items-baseline gap-1">
                          {internalTierInfo.mmr}
                          <span className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-tighter">mmr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col items-center page-content-padding pb-12">
        <div className="w-full max-w-4xl">
          {accounts.length === 0 ? (
            /* Empty State */
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Gamepad2 className="w-12 h-12 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-background rounded-full border border-border flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-cyber-orange" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                연결된 계정이 없습니다
              </h2>
              <p className="text-muted-foreground max-w-md leading-relaxed mb-8">
                본캐와 부캐를 등록하고 내전 기록을 관리해 보세요! 여러 계정을 등록하면 통합된 통계를 확인할 수 있어요.
              </p>
              <Link
                href="/valorant/register"
                className="btn-primary flex items-center gap-2 px-8 py-4 text-lg"
              >
                <Plus className="w-5 h-5" />
                발로란트 계정 연결하기
              </Link>
            </div>
          ) : (
            <>
              {/* 계정 목록 섹션 */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  내 계정 ({accounts.length}개)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                  <Link
                    key={account.puuid}
                    href={`/valorant/profile/${account.puuid}`}
                    className="card group p-5 hover:border-primary/50"
                  >
                    <div className="relative">
                      {/* 아바타 / 프로필 카드 이미지 */}
                      <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4 group-hover:border-primary/40 transition-colors overflow-hidden relative">
                        {account.cardImageUrl ? (
                          <Image
                            src={account.cardImageUrl}
                            alt={`${account.gameName} Card`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-lg font-extrabold text-white">
                            {account.gameName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* 닉네임 & 태그 */}
                      <div className="mb-3">
                        <div className="font-extrabold text-lg text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {account.gameName}
                        </div>
                        <div className="text-muted-foreground text-sm font-medium">
                          #{account.tagLine}
                        </div>
                      </div>

                      {/* 티어 */}
                      <div className={`text-sm font-bold ${getTierColor(account.currentTier)} flex items-center gap-1.5`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${account.currentTier ? 'bg-current' : 'bg-muted-foreground'}`} />
                        {account.currentTier || 'Unranked'}
                      </div>
                    </div>
                  </Link>
                ))}

                {/* 계정 추가 카드 */}
                <Link
                  href="/valorant/register"
                  className="group block"
                >
                  <div className="h-full min-h-[160px] rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-card/30 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 p-5 transition-all duration-300 hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-xl bg-secondary group-hover:bg-primary/20 border border-border group-hover:border-primary/50 flex items-center justify-center transition-all duration-300">
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        계정 연결하기
                      </div>
                      <div className="text-[11px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors mt-0.5">
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
    </div>
  );
}
