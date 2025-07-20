'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileProvider';
import { canManageChannels } from '@/lib/auth/roles';
import { Switch } from '@headlessui/react';
import GameSearchSelect from '@/components/GameSearchSelect';

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  boardActive: boolean;
  chatActive: boolean;
  game: {
    id: string;
    name: string;
  } | null;
}

export default function ChannelManager() {
  const { profile } = useProfile();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelSlug, setNewChannelSlug] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('채널 목록을 불러오는 데 실패했습니다.');
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateChannelOrder = async (updatedChannels: Channel[]) => {
    const updatedOrder = updatedChannels.map((channel, index) => ({
      id: channel.id,
      order: index,
    }));

    try {
      const res = await fetch('/api/channels/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: updatedOrder }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '순서 변경 사항을 저장하는 데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message);
      // Revert to original order on failure
      fetchChannels(); 
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === channels.length - 1) return;

    const newChannels = [...channels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap elements
    [newChannels[index], newChannels[targetIndex]] = [newChannels[targetIndex], newChannels[index]];
    
    setChannels(newChannels);
    updateChannelOrder(newChannels);
  };
  
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !newChannelSlug.trim()) {
      setError('채널 이름과 Slug는 필수 항목입니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newChannelName, 
          slug: newChannelSlug,
          description: newChannelDescription 
        }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '채널 생성에 실패했습니다.');
      }
      setNewChannelName('');
      setNewChannelSlug('');
      setNewChannelDescription('');
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGameLink = async (channelSlug: string, gameId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelSlug}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'game', gameId: gameId || null }),
      });

      if (!res.ok) {
        throw new Error('게임 연결에 실패했습니다.');
      }
      
      const updatedChannel = await res.json();
      
      // 상태 업데이트 후 목록 새로고침 대신 로컬 상태 업데이트
      setChannels(prevChannels =>
        prevChannels.map(channel => 
          channel.slug === channelSlug ? updatedChannel : channel
        )
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (slug: string, type: 'board' | 'chat', isActive: boolean) => {
    try {
      const res = await fetch(`/api/channels/${slug}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, isActive }),
      });

      if (!res.ok) {
        throw new Error('상태 업데이트에 실패했습니다.');
      }

      // 상태 업데이트 후 목록 새로고침 대신 로컬 상태 업데이트
      setChannels(prevChannels =>
        prevChannels.map(channel => {
          if (channel.slug === slug) {
            if (type === 'board') return { ...channel, boardActive: isActive };
            if (type === 'chat') return { ...channel, chatActive: isActive };
          }
          return channel;
        })
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteChannel = async (channelSlug: string) => {
    if (!confirm('정말로 이 채널을 삭제하시겠습니까? 관련된 모든 게시글, 채팅 내용이 삭제됩니다.')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelSlug}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '채널 삭제에 실패했습니다.');
      }
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!canManageChannels(profile?.role)) {
    return <p className="text-red-500">채널을 관리할 권한이 없습니다.</p>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">채널 관리</h2>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
      
      <form onSubmit={handleCreateChannel} className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">새 채널 생성</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="채널 이름"
            className="flex-grow px-3 py-2 text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={newChannelSlug}
            onChange={(e) => setNewChannelSlug(e.target.value)}
            placeholder="채널 Slug (URL 경로, 영문/숫자/- 만 가능)"
            className="flex-grow px-3 py-2 text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={newChannelDescription}
            onChange={(e) => setNewChannelDescription(e.target.value)}
            placeholder="채널 설명 (선택 사항)"
            className="flex-grow px-3 py-2 text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {loading ? '생성 중...' : '채널 생성'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">순서 변경</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연결된 게임</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">게시판 활성</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">채팅 활성</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {channels.length > 0 ? (
              channels.map((channel, index) => (
                <tr key={channel.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button onClick={() => handleMove(index, 'down')} disabled={index === channels.length - 1} className="disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{channel.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <GameSearchSelect
                      value={channel.game?.id || ''}
                      onChange={(gameId) => handleGameLink(channel.slug, gameId)}
                      initialGameName={channel.game?.name || ''}
                      className="min-w-[200px] text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Switch
                      checked={channel.boardActive}
                      onChange={(isActive) => handleToggleStatus(channel.slug, 'board', isActive)}
                      className={`${
                        channel.boardActive ? 'bg-indigo-600' : 'bg-gray-200'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                      <span
                        className={`${
                          channel.boardActive ? 'translate-x-6' : 'translate-x-1'
                        } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                      />
                    </Switch>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Switch
                      checked={channel.chatActive}
                      onChange={(isActive) => handleToggleStatus(channel.slug, 'chat', isActive)}
                      className={`${
                        channel.chatActive ? 'bg-indigo-600' : 'bg-gray-200'
                      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                      <span
                        className={`${
                          channel.chatActive ? 'translate-x-6' : 'translate-x-1'
                        } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                      />
                    </Switch>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteChannel(channel.slug)}
                      className="text-red-600 hover:text-red-900"
                      disabled={loading}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  {loading ? '채널 목록을 불러오는 중...' : '생성된 채널이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 