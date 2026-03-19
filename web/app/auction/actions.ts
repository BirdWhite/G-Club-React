'use server';

import prisma from '@/lib/database/prisma';
import { broadcastAuctionUpdate } from '@/lib/auction/realtime';
import { getCurrentUser } from '@/lib/database/supabase/auth';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';

// 타입 정의
interface AuctionConfigInput {
  id?: string;
  name: string;
  minBidIncrement: number;
  baseTimer: number;
  extensionTimer: number;
  isTierMode: boolean;
  maxTeamSize: number;
}

interface ParticipantInput {
  auctionId: string;
  name: string;
  tier?: number;
  gameRank?: string;
  prefCharacters?: string;
  bio?: string;
  orderIndex: number;
}

interface TeamInput {
  auctionId: string;
  leaderName: string;
  initialPoints: number;
  currentPoints: number;
}

interface CsvRow {
  [key: string]: string | number;
}

// 관리자 권한 체크 유틸리티
async function checkAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin_Server(user.role as { name: string } | null)) {
    throw new Error('관리자 권한이 없습니다.');
  }
  return user;
}

// ----------------------------------------------------------------------
// [입찰 로직 (Leader Action)]
// ----------------------------------------------------------------------
export async function placeBid(auctionId: string, teamId: string, participantId: string, amount: number) {
  try {
    // 1. 순차적 트랜잭션으로 가장 먼저 도착한 요청만 승인 및 잔고/티어 검증
    const result = await prisma.$transaction(async (tx) => {
      // (1) 현재 대상 매물 상태 확인 (FOR UPDATE를 모사하기 위해 먼저 participant 조회)
      const participant = await tx.auctionParticipant.findUnique({
        where: { id: participantId },
      });

      if (!participant || participant.status !== 'BIDDING' || participant.auctionId !== auctionId) {
        throw new Error('현재 입찰 가능한 대상이 아닙니다.');
      }

      // (2) 경매 설정 조회 (최소 입찰단위 등)
      const config = await tx.auctionConfig.findUnique({
        where: { id: auctionId },
      });

      if (!config || !config.isActive) {
        throw new Error('활성화된 경매가 아닙니다.');
      }

      if (config.isPaused) {
        throw new Error('경매가 현재 일시정지 상태입니다.');
      }

      // (3) 내 팀 정보 및 현재 멤버 (빈 슬롯 및 티어 체크용)
      const team = await tx.auctionTeam.findUnique({
        where: { id: teamId },
        include: { members: true },
      });

      if (!team || team.auctionId !== auctionId) {
        throw new Error('올바르지 않은 팀입니다.');
      }

      // (4) 현재 최고 입찰액 확인
      // 이 매물에 대한 입찰 중 가장 금액이 큰 것 1개
      const highestBid = await tx.auctionBid.findFirst({
        where: { participantId },
        orderBy: { amount: 'desc' },
      });

      const currentHighestAmount = highestBid ? highestBid.amount : 0;

      // 추가: 이미 최고 입찰자인 경우 입찰 차단 (자기 경합 금지)
      if (highestBid && highestBid.teamId === teamId) {
        throw new Error('이미 이 매물의 최고 입찰자입니다.');
      }

      // --- 검증 프로세스 ---
      // A. 입찰 금액은 기존 최고 금액 + 최소 단위 이상이어야 함
      if (amount < currentHighestAmount + config.minBidIncrement) {
        throw new Error(`최소 ${currentHighestAmount + config.minBidIncrement} 이상 입찰해야 합니다.`);
      }

      // B. 최대 인원 수 초과 체크 (팀장 1명 제외)
      const maxDraftableMembers = config.maxTeamSize - 1;
      if (team.members.length >= maxDraftableMembers) {
        throw new Error('팀 인원이 가득 찼습니다.');
      }

      // C. 티어 중복 체크 (티어 모드 ON 일때)
      if (config.isTierMode) {
        const hasSameTier = team.members.some((m: { tier: number }) => m.tier === participant.tier);
        if (hasSameTier) {
          throw new Error(`이미 ${participant.tier}티어 멤버가 존재합니다.`);
        }
      }

      // D. 파산 방지 로직 (Critical)
      const remainingEmptySlotsAfterThis = Math.max(0, maxDraftableMembers - (team.members.length + 1));
      const pointsAfterBid = team.currentPoints - amount;
      
      const minimumPointsNeededForRest = remainingEmptySlotsAfterThis * config.minBidIncrement;
      
      if (pointsAfterBid < minimumPointsNeededForRest) {
        throw new Error(`파산 방지! 남은 ${remainingEmptySlotsAfterThis}자리를 채우기 위해 최소 ${minimumPointsNeededForRest} 포인트가 남아야 합니다. (최대 입찰가능액: ${team.currentPoints - minimumPointsNeededForRest})`);
      }

      // (5) 검증 통과 -> 입찰 기록 저장
      const newBid = await tx.auctionBid.create({
        data: {
          auctionId,
          teamId,
          participantId,
          amount,
        },
        include: {
          team: { select: { leaderName: true } },
        }
      });

      // participant 갱신 및 타이머 연장
      await tx.auctionParticipant.update({
        where: { id: participantId },
        data: {
          winningBid: amount,
          teamId: teamId,
        }
      });
      
      const newTimerEndsAt = new Date(Date.now() + config.extensionTimer * 1000);
      await tx.auctionConfig.update({
        where: { id: auctionId },
        data: { timerEndsAt: newTimerEndsAt }
      });

      return newBid;
    });

    // 트랜잭션 성공 후 브로드캐스팅
    await broadcastAuctionUpdate(auctionId, 'BID_PLACED', result as unknown as Record<string, unknown>);
    return { success: true, bid: result };
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '입찰에 실패했습니다.';
    return { success: false, error: message };
  }
}

// ----------------------------------------------------------------------
// [진행 제어 로직 (Admin Action)]
// ----------------------------------------------------------------------

// 낙찰 (Confirm Sale)
export async function confirmSale(auctionId: string) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      const config = await tx.auctionConfig.findUnique({
        where: { id: auctionId }
      });
      if (!config || !config.currentParticipantId) throw new Error('현재 진행중인 매물이 없습니다.');

      const participant = await tx.auctionParticipant.findUnique({
        where: { id: config.currentParticipantId }
      });

      if (!participant || participant.status !== 'BIDDING') throw new Error('올바르지 않은 상태입니다.');
      if (!participant.winningBid || !participant.teamId) throw new Error('입찰 기록이 없어 낙찰할 수 없습니다.');

      // 팀 포인트 차감
      await tx.auctionTeam.update({
        where: { id: participant.teamId },
        data: {
          currentPoints: {
            decrement: participant.winningBid
          }
        }
      });

      // 참가자 상태 SOLD
      await tx.auctionParticipant.update({
        where: { id: participant.id },
        data: { status: 'SOLD' }
      });

      // 다음 매물 자동 등단 로직
      const nextParticipant = await tx.auctionParticipant.findFirst({
        where: { auctionId, status: 'WAITING' },
        orderBy: { orderIndex: 'asc' },
      });

      if (nextParticipant) {
        await tx.auctionParticipant.update({
          where: { id: nextParticipant.id },
          data: { status: 'BIDDING' }
        });
        const newTimerEndsAt = new Date(Date.now() + config.baseTimer * 1000);
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { currentParticipantId: nextParticipant.id, timerEndsAt: newTimerEndsAt, remainingTimerMs: null, isPaused: false }
        });
      } else {
        // 남은 매물이 없는 경우 리셋
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { currentParticipantId: null, timerEndsAt: null, remainingTimerMs: null, isPaused: false }
        });
      }
    });

    await broadcastAuctionUpdate(auctionId, 'SALE_CONFIRMED', { message: '낙찰되었습니다.' });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '낙찰 처리 실패';
    return { success: false, error: message };
  }
}

// 예전 낙찰/유찰 되돌리기 (Undo)
export async function undoLastAction(auctionId: string) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      // 가장 최근에 SOLD 또는 PASSED 된 참가자 찾기
      const lastActionParticipant = await tx.auctionParticipant.findFirst({
        where: { auctionId, status: { in: ['SOLD', 'PASSED'] } },
        orderBy: { updatedAt: 'desc' },
      });

      if (!lastActionParticipant) {
        throw new Error('최근에 처리된 매물이 없습니다.');
      }

      // 만약 SOLD 상태였다면 포인트 환불
      if (lastActionParticipant.status === 'SOLD' && lastActionParticipant.teamId && lastActionParticipant.winningBid) {
        await tx.auctionTeam.update({
          where: { id: lastActionParticipant.teamId },
          data: {
            currentPoints: {
              increment: lastActionParticipant.winningBid
            }
          }
        });
      }

      // 현재 진행 중이던 사람(BIDDING)을 WAITING으로 돌리기
      const currentBidding = await tx.auctionParticipant.findMany({
        where: { auctionId, status: 'BIDDING' }
      });
      for (const p of currentBidding) {
        await tx.auctionParticipant.update({
          where: { id: p.id },
          data: { status: 'WAITING', teamId: null, winningBid: null }
        });
        await tx.auctionBid.deleteMany({
          where: { participantId: p.id }
        });
      }

      // 참가자 상태 롤백 (다시 BIDDING 상태로)
      await tx.auctionParticipant.update({
        where: { id: lastActionParticipant.id },
        data: {
          status: 'BIDDING',
          teamId: null,
          winningBid: null,
        }
      });
      
      // 입찰 기록들 모두 삭제 (해당 매물에 대한 기록)
      await tx.auctionBid.deleteMany({
        where: { participantId: lastActionParticipant.id }
      });

      // Config의 현재 진행자를 이 사람으로 복구하고 타이머 리셋
      const config = await tx.auctionConfig.findUnique({
        where: { id: auctionId }
      });

      if (config) {
        const newTimerEndsAt = new Date(Date.now() + config.baseTimer * 1000);
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { 
            currentParticipantId: lastActionParticipant.id, 
            timerEndsAt: newTimerEndsAt, 
            remainingTimerMs: null, 
            isPaused: false 
          }
        });
      }
    });

    await broadcastAuctionUpdate(auctionId, 'ACTION_UNDONE', { message: '가장 최근 작업이 취소되었습니다.' });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '되돌리기 실패';
    return { success: false, error: message };
  }
}

// 다음 참가자 진행 (Advance Participant)
export async function advanceParticipant(auctionId: string, participantId: string) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      const config = await tx.auctionConfig.findUnique({ where: { id: auctionId }});
      if (!config) throw new Error('경매 설정을 찾을 수 없습니다.');
      
      // 혹시 이전에 BIDDING이던 애들이 있으면 다 WAITING으로 롤백(비정상 상태 정리)
      await tx.auctionParticipant.updateMany({
        where: { auctionId, status: 'BIDDING' },
        data: { status: 'WAITING', winningBid: null, teamId: null }
      });

      // 새 매물 BIDDING 세팅
      await tx.auctionParticipant.update({
        where: { id: participantId },
        data: { status: 'BIDDING' }
      });

      // 현재 매물 ID 변경 및 타이머 시작
      const newTimerEndsAt = new Date(Date.now() + config.baseTimer * 1000);
      await tx.auctionConfig.update({
        where: { id: auctionId },
        data: { 
          currentParticipantId: participantId, 
          isActive: true,
          isPaused: false,
          timerEndsAt: newTimerEndsAt,
          remainingTimerMs: null
        }
      });
      
      // 새 매물 시작 시 기존 입찰 기록 초기화 (안전용)
      await tx.auctionBid.deleteMany({
        where: { participantId }
      });
    });

    await broadcastAuctionUpdate(auctionId, 'PARTICIPANT_ADVANCED', { participantId });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '매물 진행 실패';
    return { success: false, error: message };
  }
}

// 유찰 처리 (Pass Participant)
export async function passParticipant(auctionId: string) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      const config = await tx.auctionConfig.findUnique({
        where: { id: auctionId }
      });
      if (!config || !config.currentParticipantId) throw new Error('현재 진행중인 매물이 없습니다.');

      // 상태 PASSED (입찰기록 등은 유지하거나 초기화 가능. 여기서는 놔둠)
      await tx.auctionParticipant.update({
        where: { id: config.currentParticipantId },
        data: { status: 'PASSED' }
      });

      // 다음 매물 자동 등단 로직
      const nextParticipant = await tx.auctionParticipant.findFirst({
        where: { auctionId, status: 'WAITING' },
        orderBy: { orderIndex: 'asc' },
      });

      if (nextParticipant) {
        await tx.auctionParticipant.update({
          where: { id: nextParticipant.id },
          data: { status: 'BIDDING' }
        });
        const newTimerEndsAt = new Date(Date.now() + config.baseTimer * 1000);
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { currentParticipantId: nextParticipant.id, timerEndsAt: newTimerEndsAt, remainingTimerMs: null, isPaused: false }
        });
      } else {
        // 남은 매물이 없는 경우 리셋
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { currentParticipantId: null, timerEndsAt: null, remainingTimerMs: null, isPaused: false }
        });
      }
    });

    await broadcastAuctionUpdate(auctionId, 'PARTICIPANT_PASSED', { message: '유찰되었습니다.' });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '유찰 처리 실패';
    return { success: false, error: message };
  }
}

// 순서 랜덤화 (Shuffle)
export async function shuffleParticipants(auctionId: string) {
  try {
    await checkAdmin();
    
    const participants = await prisma.auctionParticipant.findMany({
      where: { auctionId, status: 'WAITING' },
      select: { id: true }
    });
    
    // Fisher-Yates shuffle
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }
    
    await prisma.$transaction(
      participants.map((p: { id: string }, index: number) => 
        prisma.auctionParticipant.update({
          where: { id: p.id },
          data: { orderIndex: index }
        })
      )
    );
    
    await broadcastAuctionUpdate(auctionId, 'PARTICIPANTS_SHUFFLED', { message: '대기열 셔플 완료' });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '셔플 실패';
    return { success: false, error: message };
  }
}

// 토글 경매 상태
export async function toggleAuctionState(auctionId: string, isActive: boolean) {
  try {
    await checkAdmin();
    await prisma.auctionConfig.update({
      where: { id: auctionId },
      data: { isActive },
    });
    await broadcastAuctionUpdate(auctionId, 'AUCTION_TOGGLED', { isActive });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '상태 변경 실패';
    return { success: false, error: message };
  }
}

// 토글 경매 일시정지 상태
export async function toggleAuctionPause(auctionId: string, isPaused: boolean) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      const config = await tx.auctionConfig.findUnique({ where: { id: auctionId }});
      if (!config) throw new Error('설정 없음');
      
      if (isPaused) {
        // Pausing
        const remaining = config.timerEndsAt ? Math.max(0, config.timerEndsAt.getTime() - Date.now()) : 0;
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { isPaused: true, remainingTimerMs: remaining, timerEndsAt: null }
        });
      } else {
        // Resuming
        const newEndsAt = new Date(Date.now() + (config.remainingTimerMs || 0));
        await tx.auctionConfig.update({
          where: { id: auctionId },
          data: { isPaused: false, timerEndsAt: newEndsAt, remainingTimerMs: null }
        });
      }
    });

    await broadcastAuctionUpdate(auctionId, 'AUCTION_TOGGLED_PAUSE', { isPaused });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '일시정지 상태 변경 실패';
    return { success: false, error: message };
  }
}

// 타이머 초기화 (지정된 기본 타이머로 리셋)
export async function resetAuctionTimer(auctionId: string) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      const config = await tx.auctionConfig.findUnique({ where: { id: auctionId }});
      if (!config) throw new Error('설정 없음');
      
      const newEndsAt = new Date(Date.now() + config.baseTimer * 1000);
      await tx.auctionConfig.update({
        where: { id: auctionId },
        data: { 
          timerEndsAt: newEndsAt,
          remainingTimerMs: null,
          isPaused: false
        }
      });
    });

    await broadcastAuctionUpdate(auctionId, 'TIMER_RESET', { message: '타이머가 초기화되었습니다.' });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '타이머 초기화 실패';
    return { success: false, error: message };
  }
}

// 팀장 매칭 (Admin)
export async function matchLeader(teamId: string, matchedUserId: string | null) {
  try {
    await checkAdmin();
    await prisma.auctionTeam.update({
      where: { id: teamId },
      data: { leaderId: matchedUserId }
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '매칭 실패';
    return { success: false, error: message };
  }
}

// CSV/일괄 생성용 (Create Auction / Teams / Participants)
export async function createOrUpdateAuctionConfig(data: AuctionConfigInput) {
  try {
    await checkAdmin();
    
    const config = await prisma.auctionConfig.upsert({
      where: { id: data.id || 'new_id_will_be_ignored_if_undefined' },
      update: {
        name: data.name,
        minBidIncrement: data.minBidIncrement,
        baseTimer: data.baseTimer,
        extensionTimer: data.extensionTimer,
        isTierMode: data.isTierMode,
        maxTeamSize: data.maxTeamSize,
      },
      create: {
        name: data.name,
        minBidIncrement: data.minBidIncrement,
        baseTimer: data.baseTimer,
        extensionTimer: data.extensionTimer,
        isTierMode: data.isTierMode,
        maxTeamSize: data.maxTeamSize,
        isAutoEndEnabled: true, // 기본값
      }
    });
    return { success: true, config };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '설정 저장 실패';
    return { success: false, error: message };
  }
}

// ==========================================
// [CSV Export 및 초기화/삭제 액션 추가]
// ==========================================

export async function resetAuction(auctionId: string) {
  try {
    await checkAdmin();
    
    await prisma.$transaction(async (tx) => {
      // 1. 입찰 기록 및 현재 진행ID 삭제
      await tx.auctionBid.deleteMany({ where: { auctionId } });
      await tx.auctionConfig.update({
        where: { id: auctionId },
        data: { currentParticipantId: null, isActive: false, timerEndsAt: null, remainingTimerMs: null, isPaused: false }
      });
      
      // 2. 매물 상태 리셋
      await tx.auctionParticipant.updateMany({
        where: { auctionId },
        data: {
          status: 'WAITING',
          teamId: null,
          winningBid: null,
        }
      });
      
      // 3. 팀 포인트 리셋 (initialPoints로)
      const teams = await tx.auctionTeam.findMany({ where: { auctionId } });
      for (const team of teams) {
        await tx.auctionTeam.update({
          where: { id: team.id },
          data: { currentPoints: team.initialPoints }
        });
      }
    });

    await broadcastAuctionUpdate(auctionId, 'AUCTION_RESET', { message: '경매가 초기화되었습니다.' });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '초기화 실패';
    return { success: false, error: message };
  }
}

export async function deleteAllParticipants(auctionId: string) {
  try {
    await checkAdmin();
    await prisma.auctionParticipant.deleteMany({ where: { auctionId } });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '삭제 실패';
    return { success: false, error: message };
  }
}

export async function deleteAllTeams(auctionId: string) {
  try {
    await checkAdmin();
    await prisma.auctionTeam.deleteMany({ where: { auctionId } });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '삭제 실패';
    return { success: false, error: message };
  }
}

export async function deleteParticipant(participantId: string) {
  try {
    await checkAdmin();
    await prisma.auctionParticipant.delete({ where: { id: participantId } });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '삭제 실패';
    return { success: false, error: message };
  }
}

export async function deleteTeam(teamId: string) {
  try {
    await checkAdmin();
    await prisma.auctionTeam.delete({ where: { id: teamId } });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '삭제 실패';
    return { success: false, error: message };
  }
}

// 매물 개별 추가용
export async function addParticipant(data: ParticipantInput) {
  try {
    await checkAdmin();
    await prisma.auctionParticipant.create({ data });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '추가 실패';
    return { success: false, error: message };
  }
}

// 팀 개별 추가용
export async function addTeam(data: TeamInput) {
  try {
    await checkAdmin();
    await prisma.auctionTeam.create({ data });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '추가 실패';
    return { success: false, error: message };
  }
}

// 팀 벌크 추가용 (CSV 임포트)
export async function bulkAddTeams(auctionId: string, teams: { leaderName: string, initialPoints: number }[]) {
  try {
    await checkAdmin();
    await prisma.$transaction(
      teams.map(t => prisma.auctionTeam.create({
        data: {
          auctionId,
          leaderName: t.leaderName,
          initialPoints: t.initialPoints,
          currentPoints: t.initialPoints
        }
      }))
    );
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '팀 벌크 추가 실패';
    return { success: false, error: message };
  }
}

// 매물 벌크 추가용 (CSV 임포트)
export async function bulkAddParticipants(auctionId: string, participants: Omit<ParticipantInput, 'auctionId' | 'orderIndex'>[]) {
  try {
    await checkAdmin();
    
    // 현재 최대 orderIndex 확인
    const lastParticipant = await prisma.auctionParticipant.findFirst({
      where: { auctionId },
      orderBy: { orderIndex: 'desc' }
    });
    
    let nextIndex = lastParticipant ? lastParticipant.orderIndex + 1 : 0;

    await prisma.$transaction(
      participants.map(p => {
        const index = nextIndex++;
        return prisma.auctionParticipant.create({
          data: {
            ...p,
            auctionId,
            orderIndex: index,
            status: 'WAITING'
          }
        });
      })
    );
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '매물 벌크 추가 실패';
    return { success: false, error: message };
  }
}

// ----------------------------------------------------------------------
// Export Results (Server Fetch Array - CSV will be generated Client Side)
// ----------------------------------------------------------------------
export async function getAuctionResults(auctionId: string) {
  try {
    await checkAdmin();
    const teams = await prisma.auctionTeam.findMany({
      where: { auctionId },
      include: {
        members: {
          orderBy: { winningBid: 'desc' }
        }
      }
    });
    
    // Flatten result for CSV export
    const results: CsvRow[] = [];
    teams.forEach(team => {
      // 팀장 행 추가
      results.push({
        '팀 이름 (팀장)': team.leaderName,
        '역할': '팀장',
        '참가자 이름': team.leaderName,
        '티어': '-',
        '낙찰가': '-',
        '초기/잔여 포인트': `${team.initialPoints} / ${team.currentPoints}`,
      });
      
      // 팀원 행 추가
      team.members.forEach(member => {
         results.push({
          '팀 이름 (팀장)': team.leaderName,
          '역할': '팀원',
          '참가자 이름': member.name,
          '티어': member.tier,
          '낙찰가': member.winningBid || 0,
          '초기/잔여 포인트': '-',
         });
      });
    });

    return { success: true, data: results };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '결과 조회 실패';
    return { success: false, error: message };
  }
}

// 홈 화면 배너 노출용
export async function getActiveAuction() {
  try {
    const active = await prisma.auctionConfig.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    return active;
  } catch {
    return null;
  }
}
