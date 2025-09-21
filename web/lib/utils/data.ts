import prisma from '../database/prisma';
import { Channel } from '@prisma/client';

export interface ChannelWithSubscribers extends Channel {
  _count: {
    subscribers: number;
  };
}

export async function getChannelsData(): Promise<ChannelWithSubscribers[]> {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: { subscribers: true },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
    // Prisma는 include와 _count 타입을 완벽하게 추론하지 못할 수 있으므로, 타입 단언을 사용합니다.
    return channels as ChannelWithSubscribers[];
  } catch (error) {
    console.error('Failed to fetch channels data:', error);
    throw new Error('Could not retrieve channels from the database.');
  }
}
