'use server';

import prisma from '@/lib/database/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/database/supabase/auth';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';
import { searchValorantAccount, updateValorantAccountInfo } from './valorantAccount';
import { reprocessMatchKills } from '@/lib/valorant/matchProcessor';
import { calculateMmrDelta, calculateKda } from '@/lib/valorant/valorantMmr';
import { calculateKAST, calculateDDDelta, calculateRoundWinPercentage } from '@/lib/valorant/advancedStats';
import { recalculateTrackerScores } from '@/lib/valorant/trackerPercentile';

export interface UnlinkedAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
  isActive: boolean;
}

export interface ValorantAccountData {
  puuid: string;
  gameName: string;
  tagLine: string;
  isShared: boolean;
  isActive: boolean;
  userId: string | null;
  lastSyncedAt: Date;
  lastSyncRequestedAt: Date | null;
  needsDeepSync: boolean;
}

export interface UserData {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  valorantAccounts?: ValorantAccountData[];
}

/**
 * 모든 서버 액션에서 관리자 권한을 확인하는 헬퍼 함수
 */
async function verifyAdminAction() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: { role: true },
  });

  if (!profile || !isAdmin_Server(profile.role)) {
    return { success: false, error: '관리자 권한이 없습니다.' };
  }

  return { success: true, profile };
}

/**
 * 게임 미가입 유저 등을 위한 주인 없는 발로란트 계정을 추가합니다.
 */
export async function addStandaloneAccount(name: string, tag: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    // 닉네임과 태그로 계정 정보(puuid 등) 조회
    const searchResult = await searchValorantAccount(name, tag);
    if (!searchResult.success || !searchResult.data) {
      return { success: false, error: searchResult.error || '계정을 찾을 수 없습니다.' };
    }

    const { puuid, name: officialName, tag: officialTag } = searchResult.data;

    // 이미 존재하는 계정인지 확인
    const existingAccount = await prisma.valorantAccount.findUnique({
      where: { puuid },
    });

    if (existingAccount) {
      return { success: false, error: '이미 등록된 계정입니다.' };
    }

    // userId 없이 계정 생성
    await prisma.valorantAccount.create({
      data: {
        puuid,
        gameName: officialName,
        tagLine: officialTag,
        userId: null,
        isActive: true, // 수동 추가는 부원이므로 활성화
        needsDeepSync: true, // 과거 기록 수집 시작
      },
    });

    // 티어 등 추가 정보 즉시 동기화
    await updateValorantAccountInfo(puuid).catch(err => {
      console.error('Initial account info update failed:', err);
    });

    revalidatePath('/valorant/admin');
    return { success: true };
  } catch (error) {
    console.error('Add standalone account error:', error);
    return { success: false, error: '계정 추가 중 오류가 발생했습니다.' };
  }
}

/**
 * '주인 없는 계정 풀'만 따로 가져옵니다. (최적화용)
 */
export async function getUnlinkedAccounts(): Promise<{ success: boolean; unlinkedAccounts?: UnlinkedAccount[]; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    const unlinkedAccounts = await prisma.valorantAccount.findMany({
      where: { userId: null },
      orderBy: { gameName: 'asc' },
    });

    return {
      success: true,
      unlinkedAccounts: unlinkedAccounts.map(acc => ({
        puuid: acc.puuid,
        gameName: acc.gameName,
        tagLine: acc.tagLine,
        isActive: acc.isActive,
      }))
    };
  } catch (error) {
    console.error('Get unlinked accounts error:', error);
    return { success: false, error: '계정 풀을 불러오는 중 오류가 발생했습니다.' };
  }
}

/**
 * 관리자 페이지에 필요한 모든 데이터를 가져옵니다. 
 * (참고: 유저가 많을 수 있으므로 이제 unlinkedAccounts만 채워서 호환성 유지)
 */
export async function getAllUsersWithAccounts(): Promise<{ success: boolean; data?: UserData[]; unlinkedAccounts?: UnlinkedAccount[]; error?: string }> {
  const result = await getUnlinkedAccounts();
  if (!result.success) return { success: false, error: result.error };
  return {
    success: true,
    data: [], // 더 이상 여기서 모든 유저를 가져오지 않음
    unlinkedAccounts: result.unlinkedAccounts
  };
}

/**
 * 관리자용 유저 목록을 가져옵니다. (페이지네이션 및 검색 적용)
 */
export async function getAdminUsers(page = 1, limit = 10, search = ''): Promise<{ 
  success: boolean; 
  data?: UserData[]; 
  totalCount?: number; 
  error?: string 
}> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    const take = limit;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawUsers, totalCount] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        include: {
          valorantAccounts: true,
        },
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      prisma.userProfile.count({ where }),
    ]);

    const users: UserData[] = rawUsers.map(user => ({
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      valorantAccounts: user.valorantAccounts.map(acc => ({
        puuid: acc.puuid,
        gameName: acc.gameName,
        tagLine: acc.tagLine,
        isShared: acc.isShared,
        isActive: acc.isActive,
        userId: acc.userId,
        lastSyncedAt: acc.lastSyncedAt,
        lastSyncRequestedAt: acc.lastSyncRequestedAt,
        needsDeepSync: acc.needsDeepSync,
      }))
    }));

    return { success: true, data: users, totalCount };
  } catch (error) {
    console.error('Get admin users error:', error);
    return { success: false, error: '유저 목록을 불러오는 중 오류가 발생했습니다.' };
  }
}

/**
 * 특정 계정을 특정 유저에게 연결합니다. (기존 함수명 유지: adminLinkAccount)
 */
export async function adminLinkAccount(userId: string, puuid: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    await prisma.valorantAccount.update({
      where: { puuid },
      data: { 
        userId,
        isActive: true, // 유저와 연결되면 활성 부원으로 간주
        needsDeepSync: true // 연결 시 과거 기록 수집 시작 보장
      },
    });

    revalidatePath('/valorant/admin');
    return { success: true, message: '연결 성공' };
  } catch (error) {
    console.error('Link account error:', error);
    return { success: false, error: '계정 연결 중 오류가 발생했습니다.' };
  }
}

/**
 * 계정의 연결을 해제하여 '주인 없는 계정 풀'로 돌려보냅니다. (기존 함수명 유지: adminUnlinkAccount)
 */
export async function adminUnlinkAccount(puuid: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    await prisma.valorantAccount.update({
      where: { puuid },
      data: { 
        userId: null,
        isActive: false // 연결 해제 시 비활성(외부인)으로 변경
      },
    });

    revalidatePath('/valorant/admin');
    return { success: true, message: '해제 성공' };
  } catch (error) {
    console.error('Unlink account error:', error);
    return { success: false, error: '계정 연결 해제 중 오류가 발생했습니다.' };
  }
}

/**
 * 계정의 공유 여부(isShared) 상태를 토글합니다.
 */
export async function toggleSharedStatus(puuid: string, isShared: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    await prisma.valorantAccount.update({
      where: { puuid },
      data: { isShared },
    });

    revalidatePath('/valorant/admin');
    return { success: true };
  } catch (error) {
    console.error('Toggle shared status error:', error);
    return { success: false, error: '공유 상태 변경 중 오류가 발생했습니다.' };
  }
}

/**
 * 미가입 부원 활성화 상태 토글합니다.
 */
export async function toggleGuestMemberStatus(puuid: string, isActive: boolean): Promise<{ success: boolean; data?: UnlinkedAccount; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    // 승인 시(isActive: true) 과거 기록 백필을 위해 needsDeepSync도 true로 설정
    // 승인 취소 시(isActive: false) needsDeepSync도 false로 설정
    const updatedAccount = await prisma.valorantAccount.update({
      where: { puuid },
      data: {
        isActive,
        needsDeepSync: isActive
      },
    });

    revalidatePath('/valorant/admin');
    return {
      success: true,
      data: {
        puuid: updatedAccount.puuid,
        gameName: updatedAccount.gameName,
        tagLine: updatedAccount.tagLine,
        isActive: updatedAccount.isActive,
      } as UnlinkedAccount
    };
  } catch (error) {
    console.error('Toggle guest member status error:', error);
    return { success: false, error: '상태 변경 중 오류가 발생했습니다.' };
  }
}

/**
 * 모든 매치의 내전 여부(isOfficial)를 현재 DB의 유효 부원 기준으로 재계산합니다.
 * 사용자가 수동으로 변경한 내역(isManualOverride: true)은 제외합니다.
 */
export async function recalculateAllOfficialMatches(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, count: 0, error: adminCheck.error };

    // --- MMR 전체 재계산 로직 추가 ---
    
    // 1. 모든 UserProfile의 MMR을 1000으로 초기화
    await prisma.userProfile.updateMany({
      data: { valorantInternalMmr: 1000 }
    });

    // 2. 모든 공식 매치를 시간순(오래된 순)으로 조회
    // isOfficial이 true이거나 방금 계산해서 true가 될 예정인 매치들을 포함해야 함
    // 여기서는 안전하게 모든 매치를 조회하여 실시간 공식 여부를 판단하며 진행
    const allMatches = await prisma.valorantMatch.findMany({
      orderBy: { gameStartAt: 'asc' },
      include: {
        participants: true,
        killEvents: true
      }
    });

    // 3. 유효 부원 정보 캐싱
    const validAccounts = await prisma.valorantAccount.findMany({
      where: {
        OR: [
          { userId: { not: null } },
          { isActive: true }
        ]
      },
      select: { puuid: true, userId: true }
    });
    const validPuuids = new Set(validAccounts.map(acc => acc.puuid));
    const puuidToUserId = new Map(validAccounts.filter(a => a.userId).map(a => [a.puuid, a.userId!]));

    let officialCount = 0;

    // 4. 매치 순회하며 MMR 계산
    await prisma.$transaction(async (tx) => {
      for (const match of allMatches) {
        // 실시간 공식 여부 판단 (수동 오버라이드 우선)
        let isMatchOfficial = match.isOfficial;
        if (!match.isManualOverride) {
          const validCount = match.participants.filter(p => validPuuids.has(p.puuid)).length;
          isMatchOfficial = validCount >= 8;
          
          // 공식 여부 업데이트 (기존과 다를 경우에만)
          if (isMatchOfficial !== match.isOfficial) {
            await tx.valorantMatch.update({
              where: { id: match.id },
              data: { isOfficial: isMatchOfficial }
            });
          }
        }

        if (isMatchOfficial) {
          officialCount++;
          
          // 매치 평균 ACS/KDA 계산 (DB에 저장된 10명의 데이터 기준)
          const totalAcs = match.participants.reduce((sum, p) => sum + (p.score || 0), 0);
          const avgAcs = totalAcs / 10;
          
          const totalKda = match.participants.reduce((sum, p) => {
            const kda = calculateKda(p.kills, p.deaths, p.assists);
            return sum + kda;
          }, 0);
          const avgKda = totalKda / 10;

          const totalRounds = match.blueScore + match.redScore;

          // 우리 식구들의 MMR 및 고급 통계 업데이트
          for (const p of match.participants) {
            // 고급 통계 계산
            const roundsWon = p.team === 'Blue' ? match.blueScore : match.redScore;
            const damageDealt = (p as any).damageDealt || p.damageDone || 0;
            const damageReceived = (p as any).damageReceived || 0;
            
            const kast = calculateKAST(
              p.puuid,
              p.team,
              match.killEvents.map(k => ({
                round: k.round,
                time_in_round_in_ms: (k as any).timeInRound || 0,
                killer: { puuid: k.killerPuuid },
                victim: { puuid: k.victimPuuid },
                assistants: [] // 과거 데이터에는 어시스트 정보가 없을 수 있음
              })),
              totalRounds,
              match.participants.map(pl => ({ puuid: pl.puuid, team_id: pl.team }))
            );

            const ddDelta = calculateDDDelta(damageDealt, damageReceived, totalRounds);
            const winRate = calculateRoundWinPercentage(roundsWon, totalRounds);

            const userId = puuidToUserId.get(p.puuid);
            if (userId) {
              const userProfile = await tx.userProfile.findUnique({
                where: { userId },
                select: { valorantInternalMmr: true }
              });

              if (userProfile) {
                const myKda = calculateKda(p.kills, p.deaths, p.assists);
                const delta = calculateMmrDelta(
                  userProfile.valorantInternalMmr,
                  p.isWin,
                  p.score,
                  myKda,
                  avgAcs,
                  avgKda
                );

                const newMmr = userProfile.valorantInternalMmr + delta;
                await tx.userProfile.update({
                  where: { userId },
                  data: { valorantInternalMmr: newMmr }
                });
                await tx.valorantMatchParticipation.update({
                  where: { matchId_puuid: { matchId: match.id, puuid: p.puuid } },
                  data: { 
                    mmrDelta: delta, 
                    mmrSnapshot: newMmr,
                    kast,
                    damageDealt,
                    damageReceived,
                    damageDeltaPerRound: ddDelta,
                    roundsWon,
                    totalRounds,
                    roundWinPercentage: winRate
                  } as any
                });
              }
            } else {
              // 유저 프로필이 없는 일반 참여자도 고급 통계는 업데이트
              await tx.valorantMatchParticipation.update({
                where: { matchId_puuid: { matchId: match.id, puuid: p.puuid } },
                data: {
                  kast,
                  damageDealt,
                  damageReceived,
                  damageDeltaPerRound: ddDelta,
                  roundsWon,
                  totalRounds,
                  roundWinPercentage: winRate
                } as any
              });
            }
          }
        }
      }
    }, {
      timeout: 30000 // 매치가 많을 수 있으므로 타임아웃 넉넉히 설정
    });

    revalidatePath('/valorant/admin');
    revalidatePath('/valorant');
    revalidatePath('/valorant/leaderboard');

    // 최종적으로 모든 유저의 트래커 점수(백분위) 재계산 트리거
    await recalculateTrackerScores().catch(err => {
      console.error('Final tracker score recalculation failed after match recalculation:', err);
    });

    return {
      success: true,
      count: officialCount
    };
  } catch (error) {
    console.error('Recalculate matches and MMR error:', error);
    return { success: false, count: 0, error: '재계산 중 오류가 발생했습니다.' };
  }
}


/**
 * 오직 MMR만 다시 계산하는 독립적인 관리자 기능입니다.
 * 모든 유저의 MMR을 1000으로 초기화한 후, 공식 매치들을 시간순으로 순회하며 재계산합니다.
 */
export async function recalculateAllMmrOnly(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, count: 0, error: adminCheck.error };

    // 1. 모든 UserProfile의 MMR을 1000으로 초기화
    await prisma.userProfile.updateMany({
      data: { valorantInternalMmr: 1000 }
    });

    // 2. 이미 공식으로 판정된 매치들을 시간순(오래된 순)으로 조회
    const officialMatches = await prisma.valorantMatch.findMany({
      where: { isOfficial: true },
      orderBy: { gameStartAt: 'asc' },
      include: {
        participants: true,
        killEvents: true
      }
    });

    // 3. 유효한 계정 정보 (puuid -> userId 매핑) 조회
    const accounts = await prisma.valorantAccount.findMany({
      where: { userId: { not: null } },
      select: { puuid: true, userId: true }
    });
    const puuidToUserId = new Map(accounts.map(acc => [acc.puuid, acc.userId!]));

    // 4. 메모리 상에서 유저별 MMR 트래킹을 위한 Map 초기화
    // 모든 유저는 1000에서 시작함
    const userMmrMap = new Map<string, number>();
    const participationUpdates: any[] = [];
    
    // 5. 매치 순회하며 MMR 계산 (메모리 맵 업데이트)
    for (const match of officialMatches) {
      // 매치 평균 ACS/KDA 계산 (10명의 참여자 데이터 기준)
      const totalAcs = match.participants.reduce((sum, p) => sum + (p.score || 0), 0);
      const avgAcs = totalAcs / 10;
      
      const totalKda = match.participants.reduce((sum, p) => {
        const kda = calculateKda(p.kills, p.deaths, p.assists);
        return sum + kda;
      }, 0);
      const avgKda = totalKda / 10;

      // 우리 식구들의 MMR 업데이트 (메모리 맵 내)
      for (const p of match.participants) {
        const userId = puuidToUserId.get(p.puuid);
        if (userId) {
          // 맵에 없으면 1000으로 시작
          const currentMmr = userMmrMap.get(userId) ?? 1000;
          
          const myKda = calculateKda(p.kills, p.deaths, p.assists);
          const delta = calculateMmrDelta(
            currentMmr,
            p.isWin,
            p.score,
            myKda,
            avgAcs,
            avgKda
          );

          // 고급 통계 계산
          const totalRounds = match.blueScore + match.redScore;
          const roundsWon = p.team === 'Blue' ? match.blueScore : match.redScore;
          const damageDealt = (p as any).damageDealt || p.damageDone || 0;
          const damageReceived = (p as any).damageReceived || 0;

          const kast = calculateKAST(
            p.puuid,
            p.team,
            match.killEvents.map(k => ({
              round: k.round,
              time_in_round_in_ms: (k as any).timeInRound || 0,
              killer: { puuid: k.killerPuuid },
              victim: { puuid: k.victimPuuid },
              assistants: []
            })),
            totalRounds,
            match.participants.map(pl => ({ puuid: pl.puuid, team_id: pl.team }))
          );

          const ddDelta = calculateDDDelta(damageDealt, damageReceived, totalRounds);
          const winRate = calculateRoundWinPercentage(roundsWon, totalRounds);

          const newMmr = currentMmr + delta;
          userMmrMap.set(userId, newMmr);

          participationUpdates.push(
            prisma.valorantMatchParticipation.update({
              where: { matchId_puuid: { matchId: match.id, puuid: p.puuid } },
              data: { 
                mmrDelta: delta, 
                mmrSnapshot: newMmr,
                kast,
                damageDealt,
                damageReceived,
                damageDeltaPerRound: ddDelta,
                roundsWon,
                totalRounds,
                roundWinPercentage: winRate
              } as any
            })
          );
        } else {
          // 유저가 아니더라도 통계는 업데이트
          const totalRounds = match.blueScore + match.redScore;
          const roundsWon = p.team === 'Blue' ? match.blueScore : match.redScore;
          const damageDealt = (p as any).damageDealt || p.damageDone || 0;
          const damageReceived = (p as any).damageReceived || 0;

          const kast = calculateKAST(
            p.puuid,
            p.team,
            match.killEvents.map(k => ({
              round: k.round,
              time_in_round_in_ms: (k as any).timeInRound || 0,
              killer: { puuid: k.killerPuuid },
              victim: { puuid: k.victimPuuid },
              assistants: []
            })),
            totalRounds,
            match.participants.map(pl => ({ puuid: pl.puuid, team_id: pl.team }))
          );

          const ddDelta = calculateDDDelta(damageDealt, damageReceived, totalRounds);
          const winRate = calculateRoundWinPercentage(roundsWon, totalRounds);

          participationUpdates.push(
            prisma.valorantMatchParticipation.update({
              where: { matchId_puuid: { matchId: match.id, puuid: p.puuid } },
              data: {
                kast,
                damageDealt,
                damageReceived,
                damageDeltaPerRound: ddDelta,
                roundsWon,
                totalRounds,
                roundWinPercentage: winRate
              } as any
            })
          );
        }
      }
    }

    // 6. DB 일괄 반영 (트랜잭션 활용)
    await prisma.$transaction([
      ...Array.from(userMmrMap.entries()).map(([userId, finalMmr]) => 
        prisma.userProfile.update({
          where: { userId },
          data: { valorantInternalMmr: finalMmr }
        })
      ),
      ...participationUpdates
    ]);

    revalidatePath('/valorant/admin');
    revalidatePath('/valorant');
    revalidatePath('/valorant/leaderboard');

    // 최종적으로 모든 유저의 트래커 점수(백분위) 재계산 트리거
    await recalculateTrackerScores().catch(err => {
      console.error('Final tracker score recalculation failed after MMR recalculation:', err);
    });

    return {
      success: true,
      count: officialMatches.length
    };
  } catch (error) {
    console.error('Recalculate MMR only error:', error);
    return { success: false, count: 0, error: 'MMR 재계산 중 오류가 발생했습니다.' };
  }
}


/**
 * 전 유저의 트래커 스코어(백분위 기반)를 재계산합니다.
 */
export async function recalculateAllTrackerScores(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, count: 0, error: adminCheck.error };

    const result = await recalculateTrackerScores();
    
    revalidatePath('/valorant/admin');
    revalidatePath('/valorant');
    revalidatePath('/valorant/leaderboard');

    return {
      success: true,
      count: result?.updatedCount || 0
    };
  } catch (error) {
    console.error('Recalculate tracker scores error:', error);
    return { success: false, count: 0, error: '트래커 스코어 재계산 중 오류가 발생했습니다.' };
  }
}

/**
 * 모든 매치 데이터를 최신 로직으로 재처리합니다. (최근 200개 한정)
 */
export async function reprocessAllMatches(): Promise<{ 
  success: boolean; 
  count: number; 
  failCount: number; 
  failedMatches: string[]; 
  error?: string 
}> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, count: 0, failCount: 0, failedMatches: [], error: adminCheck.error };

    const matches = await prisma.valorantMatch.findMany({
      orderBy: { gameStartAt: 'desc' },
      take: 200,
      select: { id: true }
    });

    let currentMatchesToProcess = matches.map(m => m.id);
    let successCount = 0;
    let failCount = 0;
    const failedMatches: string[] = [];
    let attempt = 1;
    const MAX_ATTEMPT = 3;

    console.log(`[ADMIN] 데이터 전체 재처리 시작 (대상: ${matches.length}개)`);

    while (attempt <= MAX_ATTEMPT && currentMatchesToProcess.length > 0) {
      const retryList: string[] = [];
      console.log(`[ADMIN] ${attempt}차 처리 시작 (대상: ${currentMatchesToProcess.length}개)`);
      
      for (let i = 0; i < currentMatchesToProcess.length; i++) {
        const matchId = currentMatchesToProcess[i];
        try {
          console.log(`[ADMIN] [시도 ${attempt}/3] [${i + 1}/${currentMatchesToProcess.length}] 매치 처리 중: ${matchId}`);
          
          const res = await adminReprocessMatch(matchId);
          if (res.success) {
            successCount++;
          } else if (res.error?.includes('429')) {
            retryList.push(matchId);
            console.warn(`[ADMIN] 레이트 리밋(429) 도달: ${matchId}. 이후 재시도 리스트에 추가.`);
          } else {
            failCount++;
            failedMatches.push(matchId);
            console.error(`[ADMIN] 매치 처리 실패 (${matchId}): ${res.error}`);
          }
        } catch (err) {
          failCount++;
          failedMatches.push(matchId);
          console.error(`[ADMIN] 예외 발생 (${matchId}):`, err);
        }

        // 요청 간 파이프라인 방지용 짧은 대기 (2.1초)
        if (i < currentMatchesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2100));
        }
      }

      currentMatchesToProcess = retryList;
      if (currentMatchesToProcess.length > 0 && attempt < MAX_ATTEMPT) {
        console.log(`[ADMIN] ${attempt}차 처리 완료. 429 에러 ${retryList.length}개 발생. 60초 후 재시도합니다.`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
      attempt++;
    }

    // 최종적으로 남은 429 실패 건들은 실패로 기록
    if (currentMatchesToProcess.length > 0) {
      failCount += currentMatchesToProcess.length;
      failedMatches.push(...currentMatchesToProcess);
      console.error(`[ADMIN] 최대 재시도 후에도 실패한 레이트 리밋 건들: ${currentMatchesToProcess.length}개`);
    }

    console.log(`[ADMIN] 데이터 전체 재처리 완료 (성공: ${successCount}, 실패: ${failCount})`);

    revalidatePath('/valorant');
    return { 
      success: true, 
      count: successCount, 
      failCount, 
      failedMatches 
    };
  } catch (error) {
    console.error('Reprocess all matches error:', error);
    return { 
      success: false, 
      count: 0, 
      failCount: 0, 
      failedMatches: [], 
      error: '전체 재처리 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 특정 매치의 데이터를 다시 가져와서 모든 지표(킬, 스파이크 등)를 재처리합니다.
 */
export async function adminReprocessMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    const result = await reprocessMatchKills(matchId);
    if (!result.success) throw new Error('재처리 실패');

    revalidatePath('/valorant/admin');
    revalidatePath('/valorant');
    revalidatePath('/valorant/leaderboard');

    return { success: true };
  } catch (error) {
    console.error('Admin reprocess match error:', error);
    return { success: false, error: '매치 재처리 중 오류가 발생했습니다.' };
  }
}

/**
 * 관리자용 매치 목록을 가져옵니다. (페이지네이션 적용)
 */
export async function getAdminMatches(page = 1, limit = 20): Promise<{ success: boolean; data?: any[]; totalCount?: number; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    const take = limit;
    const skip = (page - 1) * limit;

    const [matches, totalCount] = await Promise.all([
      prisma.valorantMatch.findMany({
        orderBy: { gameStartAt: 'desc' },
        take,
        skip,
        include: {
        participants: {
          select: {
            puuid: true,
            account: {
              select: {
                gameName: true,
                tagLine: true,
                userId: true,
                isActive: true
              }
            }
          }
        }
      }
    }),
    prisma.valorantMatch.count()
  ]);

    // 각 매치별로 유효 부원(우리 식구) 수 계산
    const formattedMatches = matches.map(m => {
      const gClubParticipants = m.participants.filter(p => p.account.userId || p.account.isActive);
      return {
        ...m,
        gClubMemberCount: gClubParticipants.length,
        participantsList: m.participants.map(p => `${p.account.gameName}#${p.account.tagLine}`).join(', ')
      };
    });

    return { success: true, data: formattedMatches, totalCount };
  } catch (error) {
    console.error('Get admin matches error:', error);
    return { success: false, error: '매치 목록을 불러오는 중 오류가 발생했습니다.' };
  }
}

/**
 * 특정 매치의 내전 여부(isOfficial)를 수동으로 토글합니다.
 */
export async function toggleMatchOfficialStatus(matchId: string, isOfficial: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await verifyAdminAction();
    if (!adminCheck.success) return { success: false, error: adminCheck.error };

    await prisma.valorantMatch.update({
      where: { id: matchId },
      data: {
        isOfficial,
        isManualOverride: true,
        overrideByUserId: adminCheck.profile?.userId
      }
    });

    // 티어 점수(백분위 점수) 재계산 트리거
    await recalculateTrackerScores().catch(err => {
      console.error('Tracker score recalculation failed after match toggle:', err);
    });

    revalidatePath('/valorant/admin');
    revalidatePath('/valorant');
    revalidatePath('/valorant/leaderboard');

    return { success: true };
  } catch (error) {
    console.error('Toggle match official status error:', error);
    return { success: false, error: '매치 상태 변경 중 오류가 발생했습니다.' };
  }
}

