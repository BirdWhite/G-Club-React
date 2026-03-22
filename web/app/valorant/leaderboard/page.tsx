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
      '3': { label: 'Tier 3', class: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
      '4': { label: 'Tier 4', class: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
      '5': { label: 'Tier 5', class: 'bg-slate-500/10 text-slate-400 border-slate-700' },
    };
    return tierConfig[tier] || { label: `Tier ${tier}`, class: 'bg-slate-500/10 text-slate-400 border-slate-700' };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* 뒤로가기 */}
        <Link 
          href="/valorant" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          내전 기록실로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-900/20">
            <Trophy className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">VCI 순위표</h1>
            <p className="text-slate-500 text-sm mt-1">G-Club 발로란트 내전 공식 랭킹</p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 mb-6 w-fit">
          <Link
            href="/valorant/leaderboard?tab=tracker"
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currentTab === 'tracker' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            트래커 점수 순위
          </Link>
          <Link
            href="/valorant/leaderboard?tab=mmr"
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currentTab === 'mmr' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            MMR 순위
          </Link>
        </div>

        {/* 리더보드 테이블 */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">순위</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">플레이어</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">티어</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">트래커 점수</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">MMR</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">상위 %</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">참여</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-500 font-medium">
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
                        className={`group transition-colors ${isTop3 ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.tier === 'unplaced' ? (
                            <span className="text-slate-600 font-bold">-</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {index === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                              {index === 1 && <Medal className="w-4 h-4 text-slate-300" />}
                              {index === 2 && <Medal className="w-4 h-4 text-amber-700" />}
                              <span className={`font-black text-lg ${isTop3 ? 'text-white' : 'text-slate-400'}`}>
                                {index + 1}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center relative">
                              {entry.image ? (
                                <Image src={entry.image} alt={entry.name} fill className="object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                            <span className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
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
                          <span className={`font-mono font-bold ${currentTab === 'tracker' ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {entry.trackerScore ?? '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`font-mono font-bold ${currentTab === 'mmr' ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {entry.mmr}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-slate-400 text-sm">
                            {entry.topPercentage != null ? `Top ${entry.topPercentage}%` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-500 text-sm font-medium">
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
        <div className="mt-8 p-6 bg-slate-900/30 rounded-xl border border-slate-800/50 text-xs text-slate-500 leading-relaxed space-y-4">
          <div>
            <p className="mb-2">💡 <span className="font-bold text-slate-400 underline underline-offset-4 decoration-indigo-500/50">트래커 스코어 안내:</span></p>
            <p>전체 유저 데이터를 기준으로 백분위(Percentile)를 산출하여 1000점 만점으로 계산합니다. (ACS 30%, KAST 30%, Damage Delta 20%, 승률 20% 반영)</p>
          </div>
          <div>
            <p className="mb-2">💡 <span className="font-bold text-slate-400 underline underline-offset-4 decoration-indigo-500/50">MMR 시스템 안내:</span></p>
            <p>개인 활약도와 승패에 따라 변동되는 점수입니다. (ACS 50% + KDA 50% 반영)</p>
          </div>
          <p>📍 5판 이상의 공식 내전(isOfficial)에 참여한 플레이어만 랭킹에 집계됩니다.</p>
        </div>
      </div>
    </div>
  );
}
