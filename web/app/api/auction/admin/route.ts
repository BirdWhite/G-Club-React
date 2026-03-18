import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/database/supabase/auth';
import { isAdmin_Server } from '@/lib/database/auth/serverAuth';
import prisma from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if ('redirect' in authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = authResult.props!.user.role as { name: string } | null;
    if (!isAdmin_Server(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 데이터 인출
    const config = await prisma.auctionConfig.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const configId = config?.id || '';

    const teams = configId ? await prisma.auctionTeam.findMany({
      where: { auctionId: configId },
      include: {
        leader: {
          select: { userId: true, name: true, image: true }
        },
        members: true,
      }
    }) : [];

    const participants = configId ? await prisma.auctionParticipant.findMany({
      where: { auctionId: configId },
      orderBy: { orderIndex: 'asc' },
      include: {
        team: { select: { leaderName: true } }
      }
    }) : [];

    // 가입된 모든 유저 목록 (팀장 매칭용)
    const allUsers = await prisma.userProfile.findMany({
      select: { userId: true, name: true, image: true, role: { select: { name: true } } },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      config,
      teams,
      participants,
      allUsers
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching auction admin data:', error.message);
    } else {
      console.error('Error fetching auction admin data:', error);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
