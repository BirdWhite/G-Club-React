import prisma from "@/lib/database/prisma";
import ProfileClient from "./ProfileClient";
import { notFound } from "next/navigation";
import { getUserValorantTier } from "@/lib/valorant/valorantTier";
import { getGlobalPerformanceDistributions, calculatePercentile } from "@/lib/valorant/trackerPercentile";

export default async function ValorantProfilePage({ params }: { params: Promise<{ puuid: string }> }) {
  const { puuid } = await params;
  const account = await prisma.valorantAccount.findUnique({
    where: { puuid },
    include: {
      user: true,
      participations: {
        include: {
          match: true
        },
        orderBy: {
          match: { gameStartAt: 'desc' }
        }
      }
    }
  });

  if (!account) return notFound();

  // 트래커 점수 계산을 위한 분포 데이터 가져오기
  const distributions = await getGlobalPerformanceDistributions();

  // 각 매치 참여 데이터에 트래커 점수 주입
  const participationsWithScore = account.participations.map(p => {
    if (distributions.allAcs.length === 0) return { ...p, trackerScore: 0 };

    const acs = p.score / Math.max(1, p.totalRounds);
    const kast = p.kast || 0;
    const dd = p.damageDeltaPerRound || 0;
    const wr = p.roundWinPercentage || 0;

    const acsP = calculatePercentile(acs, distributions.allAcs);
    const kastP = calculatePercentile(kast, distributions.allKast);
    const ddP = calculatePercentile(dd, distributions.allDd);
    const wrP = calculatePercentile(wr, distributions.allWr);

    const trackerScore = Math.round((acsP * 3) + (kastP * 3) + (ddP * 2) + (wrP * 2));

    return {
      ...p,
      trackerScore
    };
  });

  // 내전 티어 정보 조회 (계정 주인이 있는 경우)
  const internalTierInfo = account.userId ? await getUserValorantTier(account.userId) : null;
  const connectedUser = account.user ? { name: account.user.name } : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center page-content-padding py-6 md:py-12">
        <div className="w-full max-w-4xl">
          <ProfileClient
            account={account}
            participations={participationsWithScore}
            internalTierInfo={internalTierInfo}
            connectedUser={connectedUser}
          />
        </div>
      </div>
    </div>
  );
}
