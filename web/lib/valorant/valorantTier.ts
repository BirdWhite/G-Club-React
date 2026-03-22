import prisma from '@/lib/database/prisma';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  mmr: number;
  matchCount: number;
  tier: string;
  trackerScore: number | null;
  topPercentage: number | null;
}

/**
 * MMR과 참여 횟수를 바탕으로 티어를 계산합니다.
 * 이 함수는 실시간 백분위 계산을 위해 전체 사용자 MMR 목록이 필요할 수 있으므로, 
 * 가급적 getLeaderboard 등의 컨텍스트 내에서 사용하는 것이 좋습니다.
 */
export function calculateTierFromPercentile(percentile: number): string {
  if (percentile <= 10) return '0';
  if (percentile <= 20) return '1';
  if (percentile <= 40) return '2';
  if (percentile <= 60) return '3';
  if (percentile <= 80) return '4';
  return '5';
}

/**
 * 순위표 데이터를 가져오고 각 사용자에게 티어를 부여합니다.
 */
export async function getValorantLeaderboard(): Promise<LeaderboardEntry[]> {
  // 1. 유효한 내전 참여 데이터가 있는 유저 정보 조회
  // 공식 매치(isOfficial: true) 참여 횟수도 함께 계산
  const users = await prisma.userProfile.findMany({
    where: {
      valorantAccounts: {
        some: {} // 발로란트 계정이 하나라도 있는 유저
      }
    },
    select: {
      userId: true,
      name: true,
      image: true,
      valorantInternalMmr: true,
      trackerScore: true,
      topPercentage: true,
      valorantAccounts: {
        select: {
          participations: {
            where: {
              match: { isOfficial: true }
            },
            select: { id: true }
          }
        }
      }
    }
  });

  // 2. 가공: 참여 횟수 계산 및 데이터 정형화
  const processedUsers = users.map(user => {
    const matchCount = user.valorantAccounts.reduce(
      (acc, curr) => acc + curr.participations.length, 
      0
    );
    return {
      userId: user.userId,
      name: user.name,
      image: user.image,
      mmr: user.valorantInternalMmr,
      trackerScore: user.trackerScore,
      topPercentage: user.topPercentage,
      matchCount
    };
  });

  // 3. 배치 완료 유저와 미완료 유저 분리
  const placedUsers = processedUsers
    .filter(u => u.matchCount >= 5)
    .sort((a, b) => {
      if ((b.trackerScore || 0) !== (a.trackerScore || 0)) {
        return (b.trackerScore || 0) - (a.trackerScore || 0);
      }
      return b.mmr - a.mmr; // Tracker Score가 같으면 MMR 순
    });
    
  const unplacedUsers = processedUsers
    .filter(u => u.matchCount < 5)
    .sort((a, b) => {
      if ((b.trackerScore || 0) !== (a.trackerScore || 0)) {
        return (b.trackerScore || 0) - (a.trackerScore || 0);
      }
      return b.mmr - a.mmr;
    });

  // 4. 배치 완료 유저에게 티어 부여 (백분위 기준)
  const totalPlaced = placedUsers.length;
  const leaderboard: LeaderboardEntry[] = placedUsers.map((user, index) => {
    // 순위 기반 백분위 (1위가 최상위 0%에 가까움)
    // totalPlaced가 1인 경우 0%로 처리하여 0티어 배정
    const percentile = totalPlaced > 1 ? (index / (totalPlaced - 1)) * 100 : 0;
    return {
      ...user,
      tier: calculateTierFromPercentile(percentile)
    };
  });

  // 5. 미완료 유저는 "unplaced" 처리하여 하단에 추가
  unplacedUsers.forEach(user => {
    leaderboard.push({
      ...user,
      tier: 'unplaced'
    });
  });

  return leaderboard;
}

/**
 * 특정 유저의 상세 티어 정보를 가져옵니다.
 */
export async function getUserValorantTier(userId: string): Promise<{ 
  tier: string; 
  mmr: number; 
  matchCount: number;
  trackerScore: number | null;
  topPercentage: number | null;
  acsPercentile: number | null;
  kastPercentile: number | null;
  damageDeltaPercentile: number | null;
  winRatePercentile: number | null;
} | null> {
  const leaderboard = await getValorantLeaderboard();
  const entry = leaderboard.find(e => e.userId === userId);
  
  if (!entry) return null;

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      acsPercentile: true,
      kastPercentile: true,
      damageDeltaPercentile: true,
      winRatePercentile: true
    }
  });
  
  return {
    tier: entry.tier,
    mmr: entry.mmr,
    matchCount: entry.matchCount,
    trackerScore: entry.trackerScore,
    topPercentage: entry.topPercentage,
    acsPercentile: profile?.acsPercentile ?? 0,
    kastPercentile: profile?.kastPercentile ?? 0,
    damageDeltaPercentile: profile?.damageDeltaPercentile ?? 0,
    winRatePercentile: profile?.winRatePercentile ?? 0
  };
}
