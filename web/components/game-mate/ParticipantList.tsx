import Image from 'next/image';
import { GameParticipant } from '@/types/models';

interface ParticipantListProps {
  participants: GameParticipant[];
  isLeader: boolean;
  className?: string;
  loading?: boolean;
}

export default function ParticipantList({ 
  participants, 
  isLeader, 
  loading = false 
}: ParticipantListProps) {
  if (loading) {
    return (
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 w-1/4 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="ml-3 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">참가자 목록</h3>
        <p className="mt-2 text-sm text-gray-500">아직 참가자가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">참가자 목록</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex-shrink-0">
              {participant.user?.image ? (
                <div className="relative h-10 w-10 rounded-full border-2 border-gray-200 overflow-hidden">
                  <Image
                    src={participant.user.image}
                    alt={participant.user.name || '프로필 이미지'}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-500">
                    {participant.user?.name?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3">
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-900">
                  {participant.user?.name || '익명'}
                </p>
                {participant.isLeader && (
                  <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    방장
                  </span>
                )}
              </div>
              {participant.user?.id && (
                <p className="text-xs text-gray-500 mt-0.5">
                  @{participant.user.id.substring(0, 10)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
