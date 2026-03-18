import { requireAuth } from '@/lib/database/supabase/auth';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';
import prisma from '@/lib/database/prisma';
import { AuctionClient } from '@/components/auction/AuctionClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AuctionPage() {
  const authResult = await requireAuth();
  if ('redirect' in authResult) return redirect(authResult.redirect!.destination);
  const user = authResult.props!.user;

  // 가장 최근 생성된 경매 환경 가져오기 (비활성화 상태여도 관리자는 봐야 함)
  const config = await prisma.auctionConfig.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!config) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-black text-muted-foreground">생성된 실시간 경매가 없습니다.</h1>
        {isAdmin_Server(user.role as { name: string } | null) ? (
           <a href="/auction/admin" className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow hover:bg-primary/90 transition">
             관리자 대시보드에서 생성하기
           </a>
        ) : (
          <p className="text-muted-foreground">관리자 문의 바람.</p>
        )}
      </div>
    );
  }

  // 초기 상태 조립
  const teams = await prisma.auctionTeam.findMany({
    where: { auctionId: config.id },
    include: {
      members: {
        orderBy: { winningBid: 'desc' },
      }
    }
  });

  const bids = config.currentParticipantId ? await prisma.auctionBid.findMany({
    where: { participantId: config.currentParticipantId },
    orderBy: { createdAt: 'desc' },
    include: { team: { select: { leaderName: true } } },
    take: 50 // 스크롤 길어짐 방지
  }) : [];

  const currentParticipant = config.currentParticipantId ? await prisma.auctionParticipant.findUnique({
    where: { id: config.currentParticipantId }
  }) : null;

  // 역할 판별 로직
  let role: 'ADMIN' | 'LEADER' | 'VIEWER' = 'VIEWER';
  let userTeamId: string | undefined;

  const userRole = user.role as { name: string } | null;

  if (isAdmin_Server(userRole)) {
    role = 'ADMIN';
  } else {
    const myTeam = teams.find((t: { leaderId: string | null }) => t.leaderId === user.id);
    if (myTeam) {
      role = 'LEADER';
      userTeamId = myTeam.id;
    }
  }

  return (
    <div className="w-full h-full px-4 lg:px-8 xl:px-12 py-6 animate-in fade-in duration-500">
      <AuctionClient 
        initialConfig={config}
        initialTeams={teams}
        initialBids={bids}
        initialParticipant={currentParticipant}
        role={role}
        userTeamId={userTeamId}
      />
    </div>
  );
}
