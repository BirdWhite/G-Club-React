import prisma from '@/lib/database/prisma';
import { calculateMmrDelta, calculateKda } from './valorantMmr';
import { calculateKAST, calculateDDDelta, calculateRoundWinPercentage } from './advancedStats';
import { recalculateTrackerScores } from './trackerPercentile';

const API_BASE_URL = 'https://api.henrikdev.xyz/valorant';

interface ValorantMatchData {
  metadata: {
    match_id: string;
    map: { id: string; name: string };
    started_at: string;
    game_length_in_ms: number;
    queue?: { mode_type: string; id: string };
    region: string;
  };
  players: ValorantPlayer[];
  teams: { team_id: string; rounds: { won: number; lost: number } }[];
  rounds: ValorantRound[];
  kills: ValorantKill[];
}

interface ValorantPlayer {
  puuid: string;
  name: string;
  tag: string;
  team_id: string;
  agent: { id: string; name: string };
  stats: {
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    bodyshots: number;
    legshots: number;
    damage: { dealth: number; dealt: number; received: number };
  };
  ability_casts: {
    grenade: number;
    ability_1: number;
    ability_2: number;
    ultimate: number;
  };
  tier: { id: number; name: string };
  behavior?: {
    friendly_fire: { outgoing: number };
  };
}

interface ValorantRound {
  round: number;
  plant?: { player: { puuid: string } };
  defuse?: { player: { puuid: string } };
}

interface ValorantKill {
  round: number;
  time_in_round_in_ms: number;
  killer: { puuid: string; name: string; tag: string };
  victim: { puuid: string; name: string; tag: string };
  assistants: { puuid: string; name: string; tag: string }[];
  weapon: { id: string; name: string };
}

/**
 * 매치 데이터를 파싱하여 DB에 저장합니다.
 * @param matches API로부터 받은 매치 데이터 배열
 */
export async function processAndSaveMatches(matches: ValorantMatchData[]) {
  // 모든 매치의 모든 플레이어 추출 및 고유 플레이어 정보 수집
  const allPuuids = new Set<string>();
  const uniquePlayersMap = new Map<string, ValorantPlayer>();

  matches.forEach(m => {
    if (m.players && Array.isArray(m.players)) {
      m.players.forEach((p) => {
        allPuuids.add(p.puuid);
        if (!uniquePlayersMap.has(p.puuid)) {
          uniquePlayersMap.set(p.puuid, p);
        }
      });
    }
  });

  // DB에 등록된 공식(부원) 계정인지 확인 (isOfficial 및 천적 필터링 위해)
  // isActive가 true인 계정(가입 부원 + 미가입 부원)을 우리 식구로 간주
  const registeredAccounts = await prisma.valorantAccount.findMany({
    where: {
      puuid: { in: Array.from(allPuuids) },
      isActive: true
    },
    select: { puuid: true }
  });
  const registeredPuuidSet = new Set(registeredAccounts.map(a => a.puuid));

  // 모든 10명의 플레이어를 ValorantAccount에 최소한의 정보로 저장/갱신
  const upsertPromises = Array.from(uniquePlayersMap.values()).map(p => {
    const gameName = p.name || 'Unknown';
    const tagLine = p.tag || 'Unknown';
    const currentTier = p.tier?.name || 'Unranked';

    return prisma.valorantAccount.upsert({
      where: { puuid: p.puuid },
      update: {
        gameName,
        tagLine,
        currentTier
      },
      create: {
        puuid: p.puuid,
        gameName,
        tagLine,
        currentTier,
        isActive: false,
        needsDeepSync: false,
      }
    });
  });
  await Promise.all(upsertPromises);

  // 각 매치별로 데이터 준비 및 저장
  for (const match of matches) {
    if (!match.metadata || !match.metadata.match_id) continue;

    const matchId = match.metadata.match_id;
    const players = Array.isArray(match.players) ? match.players : [];

    // isOfficial 로직: 우리 식구가 8명 이상인가?
    const registeredCount = players.filter((p) => registeredPuuidSet.has(p.puuid)).length;
    const isOfficial = registeredCount >= 8;

    const gameStartAt = new Date(match.metadata.started_at);

    // Blue/Red Score
    const blueTeam = Array.isArray(match.teams) ? match.teams.find((t) => t.team_id === 'Blue') : null;
    const redTeam = Array.isArray(match.teams) ? match.teams.find((t) => t.team_id === 'Red') : null;
    const blueScore = blueTeam?.rounds?.won || 0;
    const redScore = redTeam?.rounds?.won || 0;
    const roundsPlayed = blueScore + redScore;

    // --- 페르소나 분석용 추가 지표 추출 시작 ---
    
    // 1. 라운드 데이터를 통한 스파이크 설치/해체 집계
    const plantsCount = new Map<string, number>();
    const defusesCount = new Map<string, number>();
    
    const rounds = Array.isArray(match.rounds) ? match.rounds : [];
    rounds.forEach((r) => {
      // 스파이크 설치
      const planterPuuid = r.plant?.player?.puuid;
      if (planterPuuid) {
        plantsCount.set(planterPuuid, (plantsCount.get(planterPuuid) || 0) + 1);
      }
      // 스파이크 해체
      const defuserPuuid = r.defuse?.player?.puuid;
      if (defuserPuuid) {
        defusesCount.set(defuserPuuid, (defusesCount.get(defuserPuuid) || 0) + 1);
      }
    });

    // 2. 킬 데이터를 통한 퍼스트 블러드/데스 계산
    const firstBloodsMap = new Map<string, number>();
    const firstDeathsMap = new Map<string, number>();
    const kills = Array.isArray(match.kills) ? match.kills : [];

    // 라운드별로 킬 그룹화
    const roundKills: { [key: number]: ValorantKill[] } = {};
    kills.forEach((k) => {
      const r = k.round ?? 0;
      if (!roundKills[r]) roundKills[r] = [];
      roundKills[r].push(k);
    });

    // 각 라운드의 첫 번째 킬 찾기 (보통 Henrik API의 kills는 시간순이나 킬 발생 순서대로 정렬되어 있음)
    Object.values(roundKills).forEach((rk) => {
      // 라운드 내 킬이 있으면 첫 번째 킬 처리
      if (rk.length > 0) {
        const firstKill = rk[0];
        if (firstKill.killer?.puuid) {
          firstBloodsMap.set(firstKill.killer.puuid, (firstBloodsMap.get(firstKill.killer.puuid) || 0) + 1);
        }
        if (firstKill.victim?.puuid) {
          firstDeathsMap.set(firstKill.victim.puuid, (firstDeathsMap.get(firstKill.victim.puuid) || 0) + 1);
        }
      }
    });

    await prisma.$transaction(async (tx) => {
      // 1. 매치 생성 (존재하면 무시하거나 업데이트)
      const existingMatch = await tx.valorantMatch.findUnique({ where: { id: matchId } });
      if (!existingMatch) {
        await tx.valorantMatch.create({
          data: {
            id: matchId,
            mapId: match.metadata.map?.id || 'Unknown',
            isOfficial,
            blueScore,
            redScore,
            gameStartAt,
            gameLength: Math.floor((match.metadata.game_length_in_ms || 0) / 1000),
          }
        });
      }

      // 2. 참여자 각각 생성 (10명 모두 저장)
      const participationData = players.map((p) => {
        const team = p.team_id || 'Unknown';
        let isWin = false;
        if (team === 'Blue') isWin = blueScore > redScore;
        if (team === 'Red') isWin = redScore > blueScore;

        const characterId = p.agent?.id || 'Unknown';

        return {
          matchId,
          puuid: p.puuid,
          team,
          characterId,
          isWin,
          score: p.stats?.score || 0,
          damageDone: p.stats?.damage?.dealt || p.stats?.damage?.dealth || 0,
          kills: p.stats?.kills || 0,
          deaths: p.stats?.deaths || 0,
          assists: p.stats?.assists || 0,
          headshots: p.stats?.headshots || 0,
          bodyshots: p.stats?.bodyshots || 0,
          legshots: p.stats?.legshots || 0,
          plants: plantsCount.get(p.puuid) || 0,
          defuses: defusesCount.get(p.puuid) || 0,
          abilityCasts: p.ability_casts ? {
            grenade: p.ability_casts.grenade,
            ability1: p.ability_casts.ability_1,
            ability2: p.ability_casts.ability_2,
            ult: p.ability_casts.ultimate
          } : undefined,
          friendlyFire: p.behavior?.friendly_fire?.outgoing || 0,
          firstBloods: firstBloodsMap.get(p.puuid) || 0,
          firstDeaths: firstDeathsMap.get(p.puuid) || 0,
          kast: calculateKAST(
            p.puuid,
            team,
            match.kills.map(k => ({
              round: k.round,
              time_in_round_in_ms: k.time_in_round_in_ms,
              killer: { puuid: k.killer.puuid },
              victim: { puuid: k.victim.puuid },
              assistants: k.assistants.map(a => ({ puuid: a.puuid }))
            })),
            roundsPlayed,
            match.players.map(pl => ({ puuid: pl.puuid, team_id: pl.team_id }))
          ),
          damageDealt: p.stats?.damage?.dealt || p.stats?.damage?.dealth || 0,
          damageReceived: p.stats?.damage?.received || 0,
          damageDeltaPerRound: calculateDDDelta(
            (p.stats?.damage?.dealt || p.stats?.damage?.dealth || 0),
            (p.stats?.damage?.received || 0),
            roundsPlayed
          ),
          roundsWon: team === 'Blue' ? blueScore : redScore,
          totalRounds: roundsPlayed,
          roundWinPercentage: calculateRoundWinPercentage(
            (team === 'Blue' ? blueScore : redScore),
            roundsPlayed
          ),
          roundsPlayed
        };
      });

      if (participationData.length > 0) {
        for (const pd of participationData) {
          await tx.valorantMatchParticipation.upsert({
            where: { matchId_puuid: { matchId: pd.matchId, puuid: pd.puuid } },
            update: pd,
            create: pd
          });
        }
      }

      // --- MMR 계산 및 업데이트 시작 ---
      if (isOfficial) {
        // 1. 매치의 전체 평균 ACS 및 KDA 계산 (10명 기준)
        const totalAcs = players.reduce((sum, p) => sum + (p.stats?.score || 0), 0);
        const avgAcs = totalAcs / 10;
        
        const totalKda = players.reduce((sum, p) => {
          const kda = calculateKda(p.stats?.kills || 0, p.stats?.deaths || 0, p.stats?.assists || 0);
          return sum + kda;
        }, 0);
        const avgKda = totalKda / 10;

        // 2. 참여자 중 UserProfile이 있는(우리 식구) 사람들의 MMR 업데이트
        for (const p of players) {
          // 해당 계정의 유저 프로필 조회
          const account = await tx.valorantAccount.findUnique({
            where: { puuid: p.puuid },
            select: { userId: true }
          });

          if (account?.userId) {
            const userProfile = await tx.userProfile.findUnique({
              where: { userId: account.userId },
              select: { valorantInternalMmr: true }
            });

            if (userProfile) {
              const myKda = calculateKda(p.stats?.kills || 0, p.stats?.deaths || 0, p.stats?.assists || 0);
              const isWin = p.team_id === 'Blue' ? blueScore > redScore : redScore > blueScore;
              
              const delta = calculateMmrDelta(
                userProfile.valorantInternalMmr,
                isWin,
                p.stats?.score || 0,
                myKda,
                avgAcs,
                avgKda
              );

              // MMR 업데이트 (UserProfile 및 MatchParticipation 모두)
              const newMmr = userProfile.valorantInternalMmr + delta;
              await tx.userProfile.update({
                where: { userId: account.userId },
                data: {
                  valorantInternalMmr: newMmr
                }
              });

              await tx.valorantMatchParticipation.update({
                where: { matchId_puuid: { matchId, puuid: p.puuid } },
                data: {
                  mmrDelta: delta,
                  mmrSnapshot: newMmr
                }
              });
            }
          }
        }
      }
      // --- MMR 계산 및 업데이트 종료 ---

      // 3. 킬 이벤트 저장 (내전(Official)인 경우에만 모든 킬 로그 저장)
      const killsToSave = [];

      if (isOfficial) {
        // 내전(Official)인 경우 모든 킬 저장
        for (const k of kills) {
          killsToSave.push({
            matchId,
            killerPuuid: k.killer?.puuid,
            victimPuuid: k.victim?.puuid,
            weaponId: k.weapon?.id || null,
            weaponName: k.weapon?.name || null,
            round: k.round ?? 0,
            timeInRound: k.time_in_round_in_ms,
            roundNum: k.round ?? 0
          });
        }
      }

      if (killsToSave.length > 0) {
        // 중복 저장 방지
        await tx.valorantKillEvent.deleteMany({
          where: { matchId }
        });

        await tx.valorantKillEvent.createMany({
          data: killsToSave,
          skipDuplicates: true
        });
      }
    });
  }

  // 매치 처리가 끝난 후 모든 유저의 트래커 스코어 재계산
  await recalculateTrackerScores();
}

/**
 * 특정 매치의 데이터를 다시 가져와서 킬 로그를 재처리합니다. (리전: kr 고정)
 * @param matchId 재처리할 매치 ID
 */
export async function reprocessMatchKills(matchId: string) {
  const apiKey = process.env.HENRIKDEV_API_KEY;
  if (!apiKey) throw new Error('API 키 설정이 누락되었습니다.');

  try {
    const res = await fetch(`${API_BASE_URL}/v4/match/kr/${matchId}`, {
      method: 'GET',
      headers: { 
        'Authorization': apiKey,
        'X-API-Key': apiKey 
      },
      cache: 'no-store'
    });

    if (res.status === 429) {
      throw new Error(`API Error 429: Rate Limit Exceeded`);
    }

    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const matchData = json.data as ValorantMatchData;

    if (!matchData) throw new Error('유효한 매치 데이터가 없습니다.');

    // processAndSaveMatches를 활용하여 재저장
    await processAndSaveMatches([matchData]);

    return { success: true, region: 'kr' };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[MATCH PROCESSOR] 매치 처리 에러 (${matchId}):`, errorMsg);
    throw error;
  }
}
