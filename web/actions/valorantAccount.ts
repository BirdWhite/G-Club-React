'use server';

import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/database/supabase/auth';

export async function searchValorantAccount(name: string, tag: string) {
  try {
    const apiKey = process.env.HENRIKDEV_API_KEY;
    if (!apiKey) {
      throw new Error('API 키 설정이 누락되었습니다.');
    }

    const res = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
      },
      cache: 'no-store',
    });

    // 404 상태는 계정을 찾을 수 없음을 의미함
    if (res.status === 404) {
      return { success: false, error: '계정을 찾을 수 없습니다.' };
    }

    if (!res.ok) {
      return { success: false, error: '계정 정보를 가져오는 중 오류가 발생했습니다.' };
    }

    const data = await res.json();
    
    if (data.status !== 200 || !data.data) {
      return { success: false, error: '계정을 찾을 수 없습니다.' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Account search error:', error);
    return { success: false, error: '네트워크 또는 서버 오류가 발생했습니다.' };
  }
}

export async function registerValorantAccount(puuid: string, gameName: string, tagLine: string, cardImageUrl?: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 1:N 원칙 검사: 이미 동일한 puuid가 등록되어 있는지 검사 (핵심 방어 로직)
    const existingAccount = await prisma.valorantAccount.findUnique({
      where: { puuid }
    });

    if (existingAccount) {
      // userId가 이미 채워져 있으면 다른 사람이 등록한 계정 → 거부
      if (existingAccount.userId) {
        return { success: false, error: '이미 다른 사용자가 등록한 계정입니다.' };
      }
      // userId가 비어있으면 (관리자가 미리 등록한 계정 등) → 현재 유저로 연결
      const updatedAccount = await prisma.valorantAccount.update({
        where: { puuid },
        data: {
          userId: user.id,
          gameName,
          tagLine,
          cardImageUrl,
          needsDeepSync: true,
        }
      });

      await updateValorantAccountInfo(puuid).catch(err => {
        console.error('Initial account info update failed:', err);
      });

      return { success: true, account: updatedAccount };
    }

    // 계정 생성 연결 (needsDeepSync: true → 처음 등록 시 딥싱크 대기열에 자동 추가)
    const newAccount = await prisma.valorantAccount.create({
      data: {
        puuid,
        gameName,
        tagLine,
        cardImageUrl,
        userId: user.id,
        needsDeepSync: true,  // 최초 등록 시 3개월치 전적 딥싱크 예약
      }
    });

    // 티어 등 추가 정보 즉시 동기화 (오류가 나도 등록 자체는 성공으로 간주)
    await updateValorantAccountInfo(puuid).catch(err => {
      console.error('Initial account info update failed:', err);
    });

    return { success: true, account: newAccount };
  } catch (error) {
    console.error('Account registration error:', error);
    return { success: false, error: '계정 등록 중 서버 오류가 발생했습니다.' };
  }
}

export async function updateValorantAccountInfo(puuid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.HENRIKDEV_API_KEY;
    if (!apiKey) {
      throw new Error('API 키 설정이 누락되었습니다.');
    }

    // 1. 계정 정보 조회 (닉네임, 태그)
    const accountRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/by-puuid/account/${puuid}`, {
      method: 'GET',
      headers: { 'Authorization': apiKey },
      cache: 'no-store',
    });

    let gameName: string | undefined;
    let tagLine: string | undefined;
    let cardImageUrl: string | undefined;

    if (accountRes.ok) {
      const accountData = await accountRes.ok ? await accountRes.json() : null;
      if (accountData && accountData.status === 200 && accountData.data) {
        gameName = accountData.data.name;
        tagLine = accountData.data.tag;
        cardImageUrl = accountData.data.card?.small;
      }
    }

    // 2. MMR 정보 조회 (티어) - 지역은 KR 고정
    const mmrRes = await fetch(`https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/kr/${puuid}`, {
      method: 'GET',
      headers: { 'Authorization': apiKey },
      cache: 'no-store',
    });

    let currentTier: string | undefined;

    if (mmrRes.ok) {
      const mmrData = await mmrRes.json();
      if (mmrData.status === 200 && mmrData.data) {
        currentTier = mmrData.data.currenttierpatched;
      }
    }

    // 데이터베이스 업데이트
    if (gameName || tagLine || currentTier || cardImageUrl) {
      await prisma.valorantAccount.update({
        where: { puuid },
        data: {
          ...(gameName ? { gameName } : {}),
          ...(tagLine ? { tagLine } : {}),
          ...(currentTier ? { currentTier } : {}),
          ...(cardImageUrl ? { cardImageUrl } : {}),
          lastSyncedAt: new Date(),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Update account info error:', error);
    return { success: false, error: '계정 정보 갱신 중 오류가 발생했습니다.' };
  }
}
