'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  game?: {
    iconUrl: string | null;
  };
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error('채널 목록을 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setChannels(data.channels || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchChannels();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-black-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyber-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-black-100 text-white flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500">오류 발생</h2>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black-100 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 sm:mb-8 tracking-tight">
          채널 목록
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {channels.map((channel) => (
            <Link href={`/channels/${channel.slug}`} key={channel.id}>
              <div className="group bg-cyber-black-200 rounded-xl p-5 transition-all duration-300 ease-in-out hover:bg-cyber-black-300 hover:shadow-lg hover:scale-105">
                <div className="flex items-center mb-4">
                  {channel.game?.iconUrl ? (
                    <Image
                      src={channel.game.iconUrl}
                      alt={`${channel.name} icon`}
                      width={48}
                      height={48}
                      className="rounded-lg mr-4"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-cyber-black-300 mr-4 flex-shrink-0"></div>
                  )}
                  <h2 className="text-xl font-bold text-gray-100 truncate group-hover:text-cyber-blue">
                    {channel.name}
                  </h2>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {channel.description || `${channel.name} 채널입니다.`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 