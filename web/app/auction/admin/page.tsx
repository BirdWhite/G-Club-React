import { requireAuth } from '@/lib/database/supabase/auth';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';
import prisma from '@/lib/database/prisma';
import { AdminDashboard } from '@/components/auction/admin/AdminDashboard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AuctionAdminPage() {
  const authResult = await requireAuth();
  if ('redirect' in authResult) return redirect(authResult.redirect!.destination);
  const user = authResult.props!.user;

  const userRole = user.role as { name: string } | null;
  const isAdmin = isAdmin_Server(userRole);

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <h1 className="text-xl font-bold text-destructive">관리자 권한이 없습니다.</h1>
      </div>
    );
  }

  // 데이터 인출
  const config = await prisma.auctionConfig.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const configId = config?.id || '';

  const participants = configId ? await prisma.auctionParticipant.findMany({
    where: { auctionId: configId },
    orderBy: { orderIndex: 'asc' },
    include: {
      team: { select: { leaderName: true } }
    }
  }) : [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in">
      <h1 className="text-4xl font-black tracking-tight mb-8">실시간 경매 시스템 관리자</h1>
      
      <AdminDashboard 
        initialConfig={config}
        participants={participants}
      />
    </div>
  );
}
