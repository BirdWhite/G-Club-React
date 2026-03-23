import prisma from '@/lib/database/prisma';

/**
 * 백분위 계산 함수 (값이 클수록 100에 가까움)
 * @param value 특정 유저의 값
 * @param allValues 모든 유저의 값 배열 (정렬 여부 상관없음)
 * @returns 0 ~ 100 사이의 백분위 점수
 */
export function calculatePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 0;
  if (allValues.length === 1) return 100; // 단일 데이터인 경우 최상위(100)로 처리

  // 오름차순 정렬
  const sorted = [...allValues].sort((a, b) => a - b);
  
  // 내 점수보다 낮거나 같은 점수의 개수 찾기 (Inclusive rank)
  // 정렬된 배열에서 내 점수가 위치할 인덱스를 찾음
  let countAtOrBelow = 0;
  for (const v of sorted) {
    if (v <= value) {
      countAtOrBelow++;
    } else {
      break; // 정렬되어 있으므로 더 큰 값이 나오면 중단
    }
  }

  // 백분율 산출: (나보다 같거나 낮은 데이터 개수 / 전체 개수) * 100
  const percentile = (countAtOrBelow / sorted.length) * 100;
  
  return Math.round(percentile * 10) / 10;
}


/**
 * 백분위 계산을 위한 전체 매치 데이터 분포(ACS, KAST, DD, WinRate)를 가져옵니다.
 * (공식 내전 참여 데이터 기준)
 */
export async function getGlobalPerformanceDistributions() {
  const allParticipations = await prisma.valorantMatchParticipation.findMany({
    where: {
      match: { isOfficial: true }
    },
    select: {
      score: true,
      totalRounds: true,
      kast: true,
      damageDeltaPerRound: true,
      roundWinPercentage: true
    }
  });

  if (allParticipations.length === 0) {
    return { allAcs: [], allKast: [], allDd: [], allWr: [] };
  }

  return {
    allAcs: allParticipations.map(p => p.score / Math.max(1, p.totalRounds)),
    allKast: allParticipations.map(p => p.kast || 0),
    allDd: allParticipations.map(p => p.damageDeltaPerRound || 0),
    allWr: allParticipations.map(p => p.roundWinPercentage || 0)
  };
}


/**
 * 모든 유저의 데이터를 기반으로 트래커 스코어를 재계산합니다.
 * 계산 방식: 유저가 참여한 각 공식 매치의 트래커 점수를 계산한 후, 그 점수들의 평균을 유저의 총점으로 정의함.
 * 이를 통해 '판마다' 보시는 점수와 프로필의 총점이 완벽히 일치하게 됨.
 */
export async function recalculateTrackerScores() {
  // 1. 모든 유저 프로필과 연동된 계정의 공식 매치 참여 데이터 가져오기
  const users = await prisma.userProfile.findMany({
    select: {
      userId: true,
      valorantAccounts: {
        select: {
          participations: {
            where: {
              match: { isOfficial: true }
            },
            select: {
              score: true,
              totalRounds: true,
              kast: true,
              damageDeltaPerRound: true,
              roundWinPercentage: true,
              match: {
                select: {
                  gameStartAt: true
                }
              }
            }
          }
        }
      }
    }
  });

  // 2. 전체 매치 데이터 분포 가져오기 (비교 기준)
  const distributions = await getGlobalPerformanceDistributions();
  if (distributions.allAcs.length === 0) return;

  // 3. 유저별 매치 성적 기반 통합 점수 계산
  const results = users.map(user => {
    const userParticipations: {
      matchTrackerScore: number;
      acsP: number;
      kastP: number;
      ddP: number;
      wrP: number;
    }[] = [];

    // 유저의 모든 공식 매치 참여 데이터를 하나로 모으기 (여러 계정 통합)
    interface ParticipationWithMatch {
      score: number;
      totalRounds: number;
      kast: number | null;
      damageDeltaPerRound: number | null;
      roundWinPercentage: number | null;
      match: {
        gameStartAt: Date;
      };
    }
    const allUserParticipations: ParticipationWithMatch[] = [];
    user.valorantAccounts.forEach(account => {
      account.participations.forEach(p => {
        allUserParticipations.push(p as unknown as ParticipationWithMatch);
      });
    });

    // 최근 10판만 추출 (날짜 내림차순 정렬 후 slicing)
    const recentParticipations = allUserParticipations
      .sort((a, b) => new Date(b.match.gameStartAt).getTime() - new Date(a.match.gameStartAt).getTime())
      .slice(0, 10);

    recentParticipations.forEach(p => {
      const acs = p.score / Math.max(1, p.totalRounds);
      const kast = p.kast || 0;
      const dd = p.damageDeltaPerRound || 0;
      const wr = p.roundWinPercentage || 0;

      // 개별 매치의 백분위 및 점수 계산 (전체 분포와 비교)
      const acsP = calculatePercentile(acs, distributions.allAcs);
      const kastP = calculatePercentile(kast, distributions.allKast);
      const ddP = calculatePercentile(dd, distributions.allDd);
      const wrP = calculatePercentile(wr, distributions.allWr);

      const matchTrackerScore = Math.round((acsP * 3) + (kastP * 3) + (ddP * 2) + (wrP * 2));

      userParticipations.push({
        matchTrackerScore,
        acsP,
        kastP,
        ddP,
        wrP
      });
    });

    if (userParticipations.length === 0) return null;

    // 모든 매치의 점수 및 백분위 평균 내기
    const count = userParticipations.length;
    const avgScore = userParticipations.reduce((acc, curr) => acc + curr.matchTrackerScore, 0) / count;
    const avgAcsP = userParticipations.reduce((acc, curr) => acc + curr.acsP, 0) / count;
    const avgKastP = userParticipations.reduce((acc, curr) => acc + curr.kastP, 0) / count;
    const avgDdP = userParticipations.reduce((acc, curr) => acc + curr.ddP, 0) / count;
    const avgWrP = userParticipations.reduce((acc, curr) => acc + curr.wrP, 0) / count;

    return {
      userId: user.userId,
      trackerScore: Math.round(avgScore),
      acsPercentile: Math.round(avgAcsP * 10) / 10,
      kastPercentile: Math.round(avgKastP * 10) / 10,
      damageDeltaPercentile: Math.round(avgDdP * 10) / 10,
      winRatePercentile: Math.round(avgWrP * 10) / 10
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  if (results.length === 0) return;

  // 4. 전체 유저 중 상위 % (Top Percentage) 계산
  // 트래커 스코어 기준 (유저 간 상대 평가)
  const allTrackerScores = results.map(r => r.trackerScore);
  const resultsWithTopP = results.map(r => {
    const scoreP = calculatePercentile(r.trackerScore, allTrackerScores);
    return {
      ...r,
      topPercentage: Math.round((100 - scoreP) * 10) / 10
    };
  });

  // 5. DB 업데이트 (Prisma 트랜잭션 사용)
  await prisma.$transaction(
    resultsWithTopP.map(r => 
      prisma.userProfile.update({
        where: { userId: r.userId },
        data: {
          trackerScore: r.trackerScore,
          acsPercentile: r.acsPercentile,
          kastPercentile: r.kastPercentile,
          damageDeltaPercentile: r.damageDeltaPercentile,
          winRatePercentile: r.winRatePercentile,
          topPercentage: r.topPercentage
        }
      })
    )
  );

  return { updatedCount: resultsWithTopP.length };
}

/**
 * 특정 매치의 성능을 전체 데이터베이스 기반으로 백분위 계산하여 반환합니다.
 */
export async function getMatchPerformancePercentiles(matchId: string, puuid: string) {
  // 1. 타겟 참여 데이터 가져오기
  const target = await prisma.valorantMatchParticipation.findUnique({
    where: { matchId_puuid: { matchId, puuid } },
    include: { match: true }
  });

  if (!target) return null;

  // 2. 해당 플레이어의 지표 (ACS, KAST, DD, WR)
  const acs = target.score / Math.max(1, target.totalRounds);
  const kast = target.kast || 0;
  const dd = target.damageDeltaPerRound || 0;
  const wr = target.roundWinPercentage || 0;

  // 3. 전체 데이터셋 가져오기
  const distributions = await getGlobalPerformanceDistributions();
  if (distributions.allAcs.length === 0) return null;

  // 5. 백분위 산출
  const acsP = calculatePercentile(acs, distributions.allAcs);
  const kastP = calculatePercentile(kast, distributions.allKast);
  const ddP = calculatePercentile(dd, distributions.allDd);
  const wrP = calculatePercentile(wr, distributions.allWr);

  // 6. 트래커 스코어 계산 (ACS 30%, KAST 30%, DD 20%, WR 20%)
  const trackerScore = Math.round((acsP * 3) + (kastP * 3) + (ddP * 2) + (wrP * 2));

  return {
    matchTrackerScore: trackerScore,
    acs: Math.round(acs),
    kast: Math.round(kast * 10) / 10,
    damageDelta: Math.round(dd * 10) / 10,
    roundWinRate: Math.round(wr * 10) / 10,
    percentiles: {
      acs: acsP,
      kast: kastP,
      damageDelta: ddP,
      roundWinRate: wrP
    }
  };
}

