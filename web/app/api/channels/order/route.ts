import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/supabase/auth';
import { canManageChannels_Server } from '@/lib/auth/serverAuth';

export async function PUT(req: Request) {
  const profile = await getCurrentUser();

  if (!profile || !canManageChannels_Server(profile.role)) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { channels }: { channels: { id: string; order: number }[] } = body;

    if (!Array.isArray(channels)) {
      return NextResponse.json({ message: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const transaction = channels.map(channel => 
      prisma.channel.update({
        where: { id: channel.id },
        data: { order: channel.order },
      })
    );

    await prisma.$transaction(transaction);

    return NextResponse.json({ message: '채널 순서가 성공적으로 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error updating channel order:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 