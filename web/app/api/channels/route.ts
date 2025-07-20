import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isSuperAdmin_Server } from '@/lib/auth/serverAuth';

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: {
        order: 'asc'
      },
      include: {
        game: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasManageChannelsPermission = userProfile?.role?.permissions.some((p: { name: string; }) => p.name === 'MANAGE_CHANNELS');

  if (!isSuperAdmin_Server(userProfile?.role) && !hasManageChannelsPermission) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, slug, description } = await req.json();

    if (!name || typeof name !== 'string' || !slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ message: 'Name and a valid slug are required.' }, { status: 400 });
    }

    const existingChannel = await prisma.channel.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existingChannel) {
      return NextResponse.json({ message: 'A channel with this name or slug already exists.' }, { status: 409 });
    }

    // 트랜잭션을 사용하여 채널, 게시판, 채팅방을 함께 생성합니다.
    const newChannel = await prisma.$transaction(async (tx) => {
      // 1. 채널 생성
      const channel = await tx.channel.create({
        data: {
          name,
          slug,
          description,
        },
      });

      // 2. 게시판 생성
      await tx.board.create({
        data: {
          name: `${name} 게시판`,
          description: `${name} 채널의 게시판입니다.`,
          channelId: channel.id,
        },
      });

      // 3. 채팅방 생성
      await tx.chatRoom.create({
        data: {
          name: `${name} 채팅방`,
          description: `${name} 채널의 실시간 채팅방입니다.`,
          type: 'CHANNEL',
          channelId: channel.id,
        },
      });
      
      return channel;
    });

    return NextResponse.json(newChannel, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 