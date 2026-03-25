'use server';

import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/database/supabase/auth';
import { revalidatePath } from 'next/cache';
import { getMatchPerformancePercentiles, recalculateTrackerScores, getMatchParticipantsScores } from '@/lib/valorant/trackerPercentile';


export async function getMatchDetails(matchId: string) {
  try {
    const match = await prisma.valorantMatch.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: {
            account: {
              select: {
                puuid: true,
                gameName: true,
                tagLine: true,
                currentTier: true,
              }
            }
          },
          orderBy: {
            score: 'desc' // ACS 순서로 정렬
          }
        },
        overrideByUser: {
          select: {
            name: true,
          }
        }
      }
    });

    if (!match) {
      return { success: false, error: 'Match not found' };
    }


    // 모든 참여자의 트래커 스코어 계산
    const scores = await getMatchParticipantsScores(matchId);
    
    // 참여자 데이터에 스코어 병합
    const participantsWithScores = match.participants.map(p => ({
      ...p,
      matchTrackerScore: scores[p.puuid] || 0
    }));

    return {
      success: true,
      data: {
        ...match,
        participants: participantsWithScores
      }
    };
  } catch (error) {
    console.error('getMatchDetails error:', error);
    return { success: false, error: 'Failed to fetch match details' };
  }
}

export async function toggleMatchOfficialStatus(matchId: string, newStatus: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 해당 매치에 참여했는지 확인
    const participation = await prisma.valorantMatchParticipation.findFirst({
      where: {
        matchId,
        account: {
          userId: user.id
        }
      }
    });

    if (!participation) {
      return { success: false, error: '본인이 참여한 매치만 변경할 수 있습니다.' };
    }

    // 상태 업데이트
    await prisma.valorantMatch.update({
      where: { id: matchId },
      data: {
        isOfficial: newStatus,
        isManualOverride: true,
        overrideByUserId: user.id
      }
    });

    // 전체 트래커 스코어 재계산
    await recalculateTrackerScores();

    // 화면 갱신을 위해 revalidatePath 호출
    revalidatePath('/valorant/profile/[puuid]', 'page');

    return { success: true };
  } catch (error) {
    console.error('toggleMatchOfficialStatus error:', error);
    return { success: false, error: '상태 변경 중 오류가 발생했습니다.' };
  }
}

export async function getMatchPerformance(matchId: string, puuid: string) {
  try {
    const data = await getMatchPerformancePercentiles(matchId, puuid);
    return { success: true, data };
  } catch (error) {
    console.error('getMatchPerformance error:', error);
    return { success: false, error: 'Failed to fetch match performance' };
  }
}

