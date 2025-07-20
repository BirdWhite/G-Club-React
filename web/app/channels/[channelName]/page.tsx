'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ChannelDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  game?: {
    name: string;
    iconUrl: string | null;
  };
  board: {
    id: string;
    name: string;
  } | null;
  chatRoom: {
    id: string;
    name: string;
  } | null;
}

export default function ChannelHubPage() {
  const params = useParams();
  const router = useRouter();
  const channelName = params.channelName as string;

  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelName) return;

    const fetchChannelDetails = async () => {
      try {
        setIsLoading(true);
        // API 라우트를 `/api/channels/[channelName]` 으로 변경해야 할 수도 있습니다.
        const response = await fetch(`/api/channels/${channelName}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('채널을 찾을 수 없습니다.');
          }
          throw new Error('채널 정보를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setChannel(data.channel);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchChannelDetails();
  }, [channelName]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10">
          <p className="text-red-400 text-lg">{error}</p>
          <button 
            onClick={() => router.push('/channels')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            채널 목록으로
          </button>
        </div>
      );
    }

    if (!channel) {
      return <div className="text-center py-10 text-gray-400">채널 정보가 없습니다.</div>;
    }

    const hasBoard = channel.board !== null;
    const hasChat = channel.chatRoom !== null;

    return (
      <>
        <div className="flex items-center mb-6">
          {channel.game?.iconUrl && (
            <Image
              src={channel.game.iconUrl}
              alt={`${channel.game.name} icon`}
              width={64}
              height={64}
              className="rounded-xl mr-5"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold">{channel.name}</h1>
            <p className="text-gray-400 mt-1">{channel.description}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 게시판 카드 */}
          <div className={`rounded-xl p-6 ${hasBoard ? 'bg-cyber-black-200' : 'bg-cyber-black-200 opacity-50'}`}>
            <h2 className="text-2xl font-bold mb-3">게시판</h2>
            <p className="text-gray-400 mb-5 min-h-[40px]">
              {hasBoard ? (channel.board?.name ? `${channel.board.name}에서 다양한 이야기를 나눠보세요.` : '채널 게시판에서 다양한 이야기를 나눠보세요.') : '이 채널에는 게시판이 없습니다.'}
            </p>
            <Link href={hasBoard ? `/channels/${channel.slug}/board` : '#'}>
              <span
                className={`inline-block w-full text-center font-semibold py-3 rounded-lg transition-colors ${
                  hasBoard
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                {hasBoard ? '게시판으로 이동' : '비활성화됨'}
              </span>
            </Link>
          </div>

          {/* 채팅방 카드 */}
          <div className={`rounded-xl p-6 ${hasChat ? 'bg-cyber-black-200' : 'bg-cyber-black-200 opacity-50'}`}>
            <h2 className="text-2xl font-bold mb-3">채팅</h2>
            <p className="text-gray-400 mb-5 min-h-[40px]">
              {hasChat ? (channel.chatRoom?.name ? `${channel.chatRoom.name}에서 실시간으로 대화하세요.` : '채널 채팅방에서 실시간으로 대화하세요.') : '이 채널에는 채팅방이 없습니다.'}
            </p>
            <Link href={hasChat ? `/channels/${channel.slug}/chat` : '#'}>
               <span
                className={`inline-block w-full text-center font-semibold py-3 rounded-lg transition-colors ${
                  hasChat
                    ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                {hasChat ? '채팅 참여하기' : '비활성화됨'}
              </span>
            </Link>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-cyber-black-100 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}
