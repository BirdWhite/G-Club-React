import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { isAdmin_Server } from '@/lib/auth/serverAuth';
import { Prisma } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelName:string }> }
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
    const body = await request.json();
    const { type, isActive, gameId } = body;

    let dataToUpdate: any = {};

    if (type === 'board') {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'Invalid request body for status update' }, { status: 400 });
      }
      dataToUpdate.boardActive = isActive;
    } else if (type === 'chat') {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'Invalid request body for status update' }, { status: 400 });
      }
      dataToUpdate.chatActive = isActive;
    } else if (type === 'game') {
      dataToUpdate.game = gameId ? { connect: { id: gameId } } : { disconnect: true };
    } else {
      return NextResponse.json({ error: 'Invalid type specified' }, { status: 400 });
    }

    const updatedChannel = await prisma.channel.update({
      where: { slug: channelName },
      data: dataToUpdate,
      include: { // 업데이트된 전체 채널 정보를 다시 반환
        game: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json(updatedChannel);
  } catch (error: any) {
    console.error(`Error updating channel ${channelName} status:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: `Channel with slug '${channelName}' not found.` }, { status: 404 });
    }
    // @unique 제약 조건 위반 오류 (이미 다른 채널에 연결된 게임일 경우)
    if (error.code === 'P2002' && error.meta?.target?.includes('gameId')) {
       return NextResponse.json({ error: '해당 게임은 이미 다른 채널에 연결되어 있습니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update channel status' }, { status: 500 });
  }
} 