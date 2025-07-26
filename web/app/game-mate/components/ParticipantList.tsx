import Image from 'next/image';
import { GameParticipant } from '@/types/models';
import { Crown } from 'lucide-react';

interface ParticipantListProps {
  participants: GameParticipant[];
  authorId: string;
  className?: string;
  loading?: boolean;
}

export default function ParticipantList({ 
  participants, 
  authorId, 
  loading = false 
}: ParticipantListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center p-3 bg-gray-100 rounded-lg animate-pulse">
            <div className="h-10 w-10 rounded-full bg-gray-300"></div>
            <div className="ml-3 space-y-2">
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>아직 참여자가 없습니다.</p>
      </div>
    );
  }
  
  // 방장을 맨 앞으로 정렬
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.userId === authorId) return -1;
    if (b.userId === authorId) return 1;
    return 0;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedParticipants.map((participant) => {
        const isOwner = participant.userId === authorId;
        return (
          <div key={participant.id} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex-shrink-0">
              {participant.user.image ? (
                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                  <Image
                    src={participant.user.image}
                    alt={participant.user.name || '프로필'}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-500">
                    {participant.user.name ? participant.user.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <div className="flex items-center">
                <p className="text-sm font-bold text-gray-900">
                  {participant.user.name || '익명'}
                </p>
                {isOwner && (
                  <Crown className="ml-1.5 h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}
