'use server';

import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/database/supabase';

export async function getDashboardData() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      };
    }

    // 1. 모집 중인 게임메이트 글 개수 (OPEN)
    const gamePostCount = await prisma.gamePost.count({
      where: {
        status: 'OPEN'
      }
    });

    // 2. 경매 활성화 여부
    const activeAuction = await prisma.auctionConfig.findFirst({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    });
    const isAuctionActive = activeAuction !== null;

    // 3. 이번 달에 내가 속한 채로 완료된 매치 수 (ValorantMatch)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 사용자의 라이엇 계정 puuid 목록 조회
    const userAccounts = await prisma.valorantAccount.findMany({
      where: { userId: user.id },
      select: { puuid: true }
    });
    const puuids = userAccounts.map(a => a.puuid);

    let myCompletedMatchesCount = 0;
    if (puuids.length > 0) {
      myCompletedMatchesCount = await prisma.valorantMatchParticipation.count({
        where: {
          puuid: { in: puuids },
          match: {
            gameStartAt: {
              gte: startOfMonth
            }
          }
        }
      });
    }

    return {
      success: true,
      data: {
        gamePostCount,
        isAuctionActive,
        myCompletedMatchesCount
      }
    };
  } catch (error) {
    console.error('getDashboardData error:', error);
    return {
      success: false,
      error: '대시보드 데이터를 가져오는데 실패했습니다.'
    };
  }
}
