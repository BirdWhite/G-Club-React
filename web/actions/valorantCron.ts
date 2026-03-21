'use server';

import prisma from '@/lib/database/prisma';
import { processAndSaveMatches } from '@/lib/valorant/matchProcessor';

const API_BASE_URL = 'https://api.henrikdev.xyz/valorant';

// ────────────────────────────────────────────────────
// 단일 인스턴스 락: 동시에 딥싱크가 두 번 실행되지 않도록 방지
// ────────────────────────────────────────────────────
declare global {
  var __isValorantDeepSyncRunning: boolean | undefined;
}


/** 6초 대기 유틸 (10 req/min 이하 보장) */
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const THROTTLE_MS = 6000; // 6초 = 10 req/min

/** 딥싱크 대기열에 계정이 있는지 빠르게 확인 */
export async function hasDeepSyncQueue(): Promise<boolean> {
  const count = await prisma.valorantAccount.count({
    where: { needsDeepSync: true },
  });
  return count > 0;
}

export async function processDeepSyncQueue() {
  // ── 단일 인스턴스 락 체크 ──────────────────────────────
  if (global.__isValorantDeepSyncRunning) {
    console.log('CRON: 딥싱크가 이미 실행 중입니다. 이번 실행은 건너뜁니다.');
    return { success: false, retryable: false, message: 'Already running' };
  }
  global.__isValorantDeepSyncRunning = true;

  try {
    const apiKey = process.env.HENRIKDEV_API_KEY;
    if (!apiKey) {
      console.error('CRON: API 키 설정이 누락되었습니다.');
      return { success: false, retryable: false, message: 'API key missing' };
    }

    // 1. needsDeepSync가 true인 계정 1개 선택 (마지막 동기화 오래된 계정 우선)
    const accountToSync = await prisma.valorantAccount.findFirst({
      where: { needsDeepSync: true },
      orderBy: { lastSyncedAt: 'asc' },
    });

    if (!accountToSync) {
      console.log('CRON: 딥싱크 대기열에 계정이 없습니다.');
      return { success: true, message: 'Queue empty' };
    }

    const { puuid } = accountToSync;
    console.log(`CRON: 계정 ${puuid}의 딥싱크를 시작합니다.`);

    // 2. 90일(3개월) 전 timestamp 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);
    console.log(`CRON: 탐색 기준일 = ${cutoffDate.toISOString()} (90일 전)`);

    const limit = 10;
    let startOffset = 10; // 처음 10개(최신)는 일반 Sync에서 이미 처리됨 → 건너뜀
    let shouldContinue = true;
    let newMatchesCount = 0;
    let apiCallCount = 0;

    while (shouldContinue) {
      console.log(`CRON: [${puuid}] 페이지 요청 - start=${startOffset}`);

      const res = await fetch(
        `${API_BASE_URL}/v4/by-puuid/matches/kr/pc/${puuid}?mode=custom&size=${limit}&start=${startOffset}`,
        { method: 'GET', headers: { Authorization: apiKey }, cache: 'no-store' }
      );
      apiCallCount++;

      if (!res.ok) {
        console.error(`CRON: API 에러 (${res.status}) - 딥싱크 중단. needsDeepSync 플래그를 유지합니다.`);
        // 429 에러인 경우 retryable: true로 반환하여 루프에서 대기하도록 함
        return { 
          success: false, 
          retryable: res.status === 429 || res.status >= 500, 
          status: res.status,
          message: `API Error ${res.status}` 
        };
      }

      const { data: matches } = await res.json();

      if (!matches || matches.length === 0) {
        // 더 이상 가져올 전적 없음 → 정상 완료
        console.log(`CRON: [${puuid}] 더 이상 전적이 없습니다. 탐색 완료.`);
        break;
      }

      // 커스텀 + Standard 모드만 필터링 (스커미시/데스매치 제외)
      const validMatches = matches.filter(
        (m: any) =>
          m.metadata?.queue?.mode_type === 'Standard' &&
          m.metadata?.queue?.id === 'custom'
      );

      // 이미 DB에 저장된 매치 ID 확인
      const fetchedMatchIds = validMatches
        .map((m: any) => m.metadata?.match_id)
        .filter(Boolean);
      const existingMatchesInDb = await prisma.valorantMatch.findMany({
        where: { id: { in: fetchedMatchIds } },
        select: { id: true },
      });
      const existingMatchIds = new Set(existingMatchesInDb.map(m => m.id));

      const newMatchesToSave: any[] = [];
      let reachedCutoff = false;

      for (const match of validMatches) {
        if (!match.metadata?.match_id) continue;

        // 90일 이전 기록에 도달하면 즉시 종료
        const matchStartTimeSec = new Date(match.metadata.started_at).getTime() / 1000;
        if (matchStartTimeSec < cutoffTimestamp) {
          console.log(
            `CRON: [${puuid}] 90일 이전 기록 도달 (${match.metadata.started_at}). 탐색 완료.`
          );
          reachedCutoff = true;
          shouldContinue = false;
          break;
        }

        // 이미 DB에 있는 매치는 저장 건너뜀 (하지만 탐색은 계속)
        if (existingMatchIds.has(match.metadata.match_id)) {
          console.log(`CRON: [${puuid}] 중복 매치 건너뜀 - ${match.metadata.match_id}`);
          continue;
        }

        newMatchesToSave.push(match);
      }

      if (newMatchesToSave.length > 0) {
        // MMR 계산을 위해 과거 매치부터 순차적으로 처리
        const sortedNewMatches = [...newMatchesToSave].sort((a, b) => 
          new Date(a.metadata.game_start_at || a.metadata.started_at).getTime() - 
          new Date(b.metadata.game_start_at || b.metadata.started_at).getTime()
        );
        await processAndSaveMatches(sortedNewMatches);
        newMatchesCount += newMatchesToSave.length;
        console.log(`CRON: [${puuid}] ${newMatchesToSave.length}개 저장 완료 (누적: ${newMatchesCount}개)`);
      }

      if (reachedCutoff) break;

      // 가져온 결과가 limit보다 적으면 마지막 페이지 → 종료
      if (matches.length < limit) {
        console.log(`CRON: [${puuid}] 마지막 페이지 도달. 탐색 완료.`);
        shouldContinue = false;
        break;
      }

      startOffset += limit;

      // ── 스로틀: 6초 대기 (10 req/min 이하 보장) ──────────
      console.log(`CRON: [${puuid}] 스로틀 대기 중... (${THROTTLE_MS / 1000}초) [총 API 호출: ${apiCallCount}회]`);
      await delay(THROTTLE_MS);
    }

    // 3. 정상 완료 시에만 needsDeepSync를 false로 업데이트
    await prisma.valorantAccount.update({
      where: { puuid },
      data: { needsDeepSync: false },
    });

    console.log(`CRON: 계정 ${puuid}의 딥싱크 완료. (새로 저장된 매치: ${newMatchesCount}개, API 호출: ${apiCallCount}회)`);
    return { success: true, newMatchesCount, apiCallCount };
  } catch (error) {
    console.error('CRON: Valorant deep sync error:', error);
    return { success: false, retryable: true, message: error instanceof Error ? error.message : String(error) };
  } finally {
    // 락 해제 (에러가 발생해도 반드시 해제)
    global.__isValorantDeepSyncRunning = false;
  }
}

// valorantSync.ts와 중복되는 함수. (실제 환경에서는 lib/valorant로 공통 모듈 분리하는 것이 좋습니다)
