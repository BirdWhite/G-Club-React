/**
 * 발로란트 고급 통계 계산 유틸리티
 */

interface KillLog {
  round: number;
  time_in_round_in_ms: number;
  killer: { puuid: string };
  victim: { puuid: string };
  assistants: { puuid: string }[];
}

interface PlayerInfo {
  puuid: string;
  team_id: string;
}

/**
 * KAST를 계산합니다.
 * KAST: Kill, Assist, Survive, Trade
 */
export function calculateKAST(
  puuid: string,
  teamId: string,
  kills: KillLog[],
  totalRounds: number,
  players: PlayerInfo[]
): number {
  if (totalRounds <= 0) return 0;

  let successfulRounds = 0;
  const teammatesPuuids = new Set(
    players.filter(p => p.team_id === teamId).map(p => p.puuid)
  );

  for (let r = 1; r <= totalRounds; r++) {
    const roundKills = kills.filter(k => k.round === r);
    
    // 1. Kill 거뒀는지 확인
    const hasKill = roundKills.some(k => k.killer.puuid === puuid);
    if (hasKill) {
      successfulRounds++;
      continue;
    }

    // 2. Assist 했는지 확인
    const hasAssist = roundKills.some(k => 
      k.assistants?.some(a => a.puuid === puuid)
    );
    if (hasAssist) {
      successfulRounds++;
      continue;
    }

    // 3. 생존(Survive) 했는지 확인
    const died = roundKills.some(k => k.victim.puuid === puuid);
    if (!died) {
      successfulRounds++;
      continue;
    }

    // 4. 트레이드(Trade) 확인 (본인이 죽었을 때만 이 순서까지 옴)
    // 본인이 죽은 킬 로그 찾기
    const myDeath = roundKills.find(k => k.victim.puuid === puuid);
    if (myDeath) {
      const killerPuuid = myDeath.killer.puuid;
      const deathTime = myDeath.time_in_round_in_ms;

      // 내 사망 이후 3000ms 이내에, 나를 죽인 killer를 우리 팀원이 죽였는지 확인
      const isTraded = roundKills.some(k => 
        k.victim.puuid === killerPuuid && 
        teammatesPuuids.has(k.killer.puuid) &&
        k.time_in_round_in_ms >= deathTime &&
        k.time_in_round_in_ms <= deathTime + 3000
      );

      if (isTraded) {
        successfulRounds++;
        continue;
      }
    }
  }

  const kast = (successfulRounds / totalRounds) * 100;
  return Math.round(kast * 10) / 10; // 소수점 첫째 자리 반올림
}

/**
 * DD 델타 (Damage Delta Per Round) 계산
 */
export function calculateDDDelta(dealt: number, received: number, totalRounds: number): number {
  if (totalRounds <= 0) return 0;
  const delta = (dealt - received) / totalRounds;
  return Math.round(delta * 10) / 10;
}

/**
 * 라운드 승률 계산
 */
export function calculateRoundWinPercentage(won: number, totalRounds: number): number {
  if (totalRounds <= 0) return 0;
  const winRate = (won / totalRounds) * 100;
  return Math.round(winRate * 10) / 10;
}
