import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { isAdmin_Server } from '@/lib/auth/serverAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelName: string }> }
) {
  const { channelName } = await params;
  try {
    const channel = await prisma.channel.findUnique({
      where: { slug: channelName },
      include: {
        game: {
          select: {
            name: true,
            iconUrl: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
          },
        },
        chatRoom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: '채널을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error(`[API] 채널(${channelName}) 정보 조회 오류:`, error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelName: string }> }
) {
  const { channelName } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: { role: true },
  });

  if (!userProfile || !isAdmin_Server(userProfile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    if (!channelName) {
      return NextResponse.json({ error: 'Channel name is required.' }, { status: 400 });
    }
    
    await prisma.channel.delete({
      where: { slug: channelName },
    });

    return NextResponse.json({ message: `Channel '${channelName}' and all its related data deleted successfully.` });

  } catch (error: any) {
    console.error(`Error deleting channel ${channelName}:`, error);
     if (error.code === 'P2025') {
      return NextResponse.json({ error: `Channel with slug '${channelName}' not found` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
} 