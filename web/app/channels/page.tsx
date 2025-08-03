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
            <Link href={`/channels/${channel.slug}/board`} key={channel.id}>
              <div className="group bg-cyber-black-200 rounded-xl p-5 transition-all duration-300 ease-in-out hover:bg-cyber-black-300 hover:shadow-lg hover:scale-105 h-32 flex flex-col">
                <div className="flex items-center mb-4">
                  {channel.slug === 'notices' ? (
                    // 공지사항 채널인 경우 확성기 아이콘 표시
                    <div className="w-12 h-12 rounded-lg bg-cyber-blue/20 border border-cyber-blue/30 mr-4 flex-shrink-0 flex items-center justify-center">
                      <svg 
                        className="w-6 h-6 text-cyber-blue" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" 
                        />
                      </svg>
                    </div>
                  ) : channel.game?.iconUrl ? (
                    // 게임 채널인 경우 게임 아이콘 표시
                    <div className="w-12 h-12 rounded-lg bg-white border border-cyber-black-300 mr-4 flex-shrink-0 overflow-hidden">
                      <Image
                        src={channel.game.iconUrl}
                        alt={`${channel.name} icon`}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    // 기본 아이콘
                    <div className="w-12 h-12 rounded-lg bg-cyber-black-300 border border-cyber-black-400 mr-4 flex-shrink-0 flex items-center justify-center">
                      <svg 
                        className="w-6 h-6 text-cyber-gray" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                        />
                      </svg>
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-gray-100 truncate group-hover:text-cyber-blue">
                    {channel.name}
                  </h2>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 overflow-hidden flex-grow">
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