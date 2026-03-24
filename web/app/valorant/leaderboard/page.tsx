import { getValorantLeaderboard } from '@/lib/valorant/valorantTier';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Medal, User, ChevronLeft } from 'lucide-react';

export default async function ValorantLeaderboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const currentTab = tab === 'mmr' ? 'mmr' : 'tracker';

  const leaderboardData = await getValorantLeaderboard();

  // 배치 완료 유저와 미완료 유저 분리
  const placedUsers = leaderboardData.filter(u => u.tier !== 'unplaced');
  const unplacedUsers = leaderboardData.filter(u => u.tier === 'unplaced');

  // 정렬 로직 적용
  if (currentTab === 'mmr') {
    placedUsers.sort((a, b) => b.mmr - a.mmr);
  } else {
    placedUsers.sort((a, b) => (b.trackerScore || 0) - (a.trackerScore || 0));
  }

  const sortedLeaderboard = [...placedUsers, ...unplacedUsers];

  const getTierBadge = (tier: string) => {
    if (tier === 'unplaced') return { label: '배치 중', class: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    const tierConfig: Record<string, { label: string, class: string }> = {
      '0': { label: 'Tier 0', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
      '1': { label: 'Tier 1', class: 'bg-red-500/10 text-red-500 border-red-500/30' },
      '2': { label: 'Tier 2', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
      '3': { label: 'Tier 3', class: 'bg-primary/10 text-primary border-primary/30' },
      '4': { label: 'Tier 4', class: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
      '5': { label: 'Tier 5', class: 'bg-slate-500/10 text-slate-400 border-slate-700' },
    };
    return tierConfig[tier] || { label: `Tier ${tier}`, class: 'bg-slate-500/10 text-slate-400 border-slate-700' };
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center page-content-padding py-12">
        <div className="w-full max-w-4xl">
          {/* 뒤로가기 */}
          <Link
            href="/valorant"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            내전 기록실로 돌아가기
          </Link>

          {/* 헤더 */}
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg shadow-primary/10">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">VCI 순위표</h1>
              <p className="text-muted-foreground text-sm mt-1">G-Club 발로란트 내전 공식 랭킹</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex bg-secondary p-1 rounded-xl border border-border mb-6 w-fit">
            <Link
              href="/valorant/leaderboard?tab=tracker"
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currentTab === 'tracker' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              트래커 점수 순위
            </Link>
            <Link
              href="/valorant/leaderboard?tab=mmr"
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currentTab === 'mmr' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              MMR 순위
            </Link>
          </div>

          {/* 리더보드 테이블 */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">순위</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">플레이어</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">티어</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">트래커 점수</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">내전 MMR</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">상위 %</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">참여</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground font-medium">
                        데이터가 아직 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedLeaderboard.map((entry, index) => {
                      const badge = getTierBadge(entry.tier);
                      const isTop3 = entry.tier !== 'unplaced' && index < 3;

                      return (
                        <tr
                          key={entry.userId}
                          className={`group transition-colors ${isTop3 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/20'}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {entry.tier === 'unplaced' ? (
                              <span className="text-muted-foreground/40 font-bold">-</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {index === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                                {index === 1 && <Medal className="w-4 h-4 text-slate-300" />}
                                {index === 2 && <Medal className="w-4 h-4 text-amber-700" />}
                                <span className={`font-black text-lg ${isTop3 ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                                  {index + 1}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="transparent"
                                    className="text-secondary/50"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 20}
                                    strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(1000, entry.trackerScore || 0) / 1000)}
                                    strokeLinecap="round"
                                    className={`transition-all duration-1000 ease-out ${(entry.trackerScore || 0) < 200 ? 'text-slate-400' :
                                        (entry.trackerScore || 0) < 400 ? 'text-blue-400' :
                                          (entry.trackerScore || 0) < 600 ? 'text-emerald-400' :
                                            (entry.trackerScore || 0) < 800 ? 'text-yellow-400' :
                                              'text-red-500'
                                      }`}
                                  />
                                </svg>
                                <div className="relative w-10 h-10 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                                  {entry.image ? (
                                    <Image src={entry.image} alt={entry.name} fill className="object-cover" unoptimized />
                                  ) : (
                                    <User className="w-5 h-5 text-muted-foreground/60" />
                                  )}
                                </div>
                              </div>
                              <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                {entry.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${badge.class}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`font-mono font-bold ${currentTab === 'tracker' ? 'text-primary' : 'text-foreground/80'}`}>
                              {entry.trackerScore ?? '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`font-mono font-bold ${currentTab === 'mmr' ? 'text-primary' : 'text-foreground/80'}`}>
                              {entry.mmr}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-muted-foreground text-sm">
                              {entry.topPercentage != null ? `Top ${entry.topPercentage}%` : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground text-sm font-medium">
                            {entry.matchCount} <span className="text-[10px] uppercase">GAMES</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 하단 정보 */}
          <div className="mt-8 p-6 card bg-muted/20 text-xs text-muted-foreground leading-relaxed space-y-4">
            <div>
              <p className="mb-2">💡 <span className="font-bold text-foreground underline underline-offset-4 decoration-primary/50">트래커 점수 안내:</span></p>
              <p>전체 유저 데이터를 기준으로 백분위(Percentile)를 산출하여 1000점 만점으로 계산합니다. (ACS 30%, KAST 30%, Damage Delta 20%, 승률 20% 반영)</p>
            </div>
            <div>
              <p className="mb-2">💡 <span className="font-bold text-foreground underline underline-offset-4 decoration-primary/50">내전 MMR 시스템 안내:</span></p>
              <p>개인 활약도와 승패에 따라 변동되는 점수입니다. (ACS 50% + KDA 50% 반영)</p>
            </div>
            <p className="flex items-center gap-1.5 pt-2 text-[11px] font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              5판 이상의 공식 내전(isOfficial)에 참여한 플레이어만 랭킹에 집계됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
