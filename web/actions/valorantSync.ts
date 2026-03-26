'use server';

import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/database/supabase/auth';
import { updateValorantAccountInfo } from './valorantAccount';
import { processAndSaveMatches } from '@/lib/valorant/matchProcessor';
import { recalculateTrackerScores } from '@/lib/valorant/trackerPercentile';


const API_BASE_URL = 'https://api.henrikdev.xyz/valorant';


export async function syncRecentMatches(puuid: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const apiKey = process.env.HENRIKDEV_API_KEY;
    if (!apiKey) throw new Error('API 키 설정이 누락되었습니다.');

    const account = await prisma.valorantAccount.findUnique({
      where: { puuid }
    });

    if (!account) return { success: false, error: '등록된 계정이 아닙니다.' };

    // 쿨다운 체크
    if (account.lastSyncRequestedAt) {
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - account.lastSyncRequestedAt.getTime()) / 1000);
      if (diffSeconds < 180) {
        return { success: false, error: `갱신 쿨다운 중입니다. ${180 - diffSeconds}초 후 다시 시도해주세요.`, cooldown: 180 - diffSeconds };
      }
    }
    
    // 닉네임, 태그, 티어 정보 최신화 (UUID 기반)
    await updateValorantAccountInfo(puuid);

    // API 호출 (최대 10개)
    const res = await fetch(`${API_BASE_URL}/v4/by-puuid/matches/kr/pc/${puuid}?mode=custom&size=10`, {
      method: 'GET',
      headers: { 'Authorization': apiKey },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[ValorantSync] API Error ${res.status} from ${res.url}:`, errText);
      if (res.status === 404 || res.status === 400) {
        return { success: false, error: '기록이 없거나 유효하지 않은 계정입니다.' };
      }
      return { success: false, error: '전적을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.' };
    }

    const json = await res.json();
    const matches = json.data || [];
    
    // 최근 전적이 아예 없는 경우
    if (matches.length === 0) {
      await prisma.valorantAccount.update({
        where: { puuid },
        data: { lastSyncRequestedAt: new Date() }
      });
      // 혹시 모르니 재계산 트리거 (수동 변경사항 반영용)
      await recalculateTrackerScores().catch(() => {});
      return { success: true, message: '최근 전적이 없습니다.' };
    }

    // 커스텀 & 일반 모드 (스커미시/데스매치 제외)만 필터링
    const validMatches = matches.filter((m: any) => 
      m.metadata?.queue?.mode_type === 'Standard' && 
      m.metadata?.queue?.id === 'custom'
    );

    // 유효한 매치들의 ID 추출
    const fetchedMatchIds = validMatches.map((m: any) => m.metadata?.match_id).filter(Boolean);

    // DB에 존재하는 매치 개수 확인
    const existingMatchesItem = await prisma.valorantMatch.findMany({
      where: { id: { in: fetchedMatchIds } },
      select: { id: true }
    });

    const existingMatchIds = new Set(existingMatchesItem.map(m => m.id));
    const newMatches = validMatches.filter((m: any) => m.metadata?.match_id && !existingMatchIds.has(m.metadata.match_id));

    // 단절 감지(Gap Detection): 유효한 매치가 하나라도 있고, 그 중 기존 DB에 등록된 게 단 하나도 없다면 갭
    const isGapDetected = validMatches.length > 0 && existingMatchesItem.length === 0;

    // 새로운 매치가 없으면 쿨다운만 갱신
    if (newMatches.length === 0) {
      await prisma.valorantAccount.update({
        where: { puuid },
        data: { 
          lastSyncRequestedAt: new Date(),
          // needsDeepSync는 건드리지 않음
        }
      });
      // 수동 변경사항(내전 여부 등) 반영을 위해 새로운 매치가 없더라도 재계산 트리거
      await recalculateTrackerScores().catch(() => {});
      return { success: true, message: '이미 모든 전적이 최신 상태입니다.', updatedCount: 0 };
    }

    // 새로운 매치들을 시간순(과거 -> 현재)으로 정렬 (MMR 계산 순서 중요)
    const sortedNewMatches = [...newMatches].sort((a: any, b: any) => 
      new Date(a.metadata.started_at).getTime() - new Date(b.metadata.started_at).getTime()
    );

    // 트랜잭션으로 새로운 매치와 참여 기록 저장 (내부에서 recalculateTrackerScores 호출함)
    await processAndSaveMatches(sortedNewMatches);

    // 계정 업데이트 (쿨다운, needsDeepSync)
    await prisma.valorantAccount.update({
      where: { puuid },
      data: {
        lastSyncRequestedAt: new Date(),
        ...(isGapDetected ? { needsDeepSync: true } : {}) // true일 때만 업데이트 (기존과 이어졌으면 건들지 않음)
      }
    });

    return { 
      success: true, 
      message: `${newMatches.length}개의 새로운 전적을 갱신했습니다.`, 
      updatedCount: newMatches.length,
      needsDeepSync: isGapDetected ? true : account.needsDeepSync
    };


  } catch (error) {
    console.error('Valorant sync error:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

