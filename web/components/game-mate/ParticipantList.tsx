import { GameParticipant } from '@/types/models';
import { Crown } from 'lucide-react';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';

interface ParticipantListProps {
  participants: GameParticipant[];
  authorId: string;
  className?: string;
  loading?: boolean;
}

export function ParticipantList({ 
  participants, 
  authorId, 
  loading = false 
}: ParticipantListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center p-3 bg-card border border-border rounded-lg animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
                          <div className="ml-3 space-y-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
              </div>
          </div>
        ))}
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground bg-card border border-border rounded-lg">
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
        const isGuest = participant.participantType === 'GUEST';
        const displayName = isGuest ? participant.guestName : (participant.user?.name || '익명');
        const displayImage = isGuest ? null : participant.user?.image;
        
        return (
          <div key={participant.id} className="flex items-center p-3 bg-card border border-border rounded-lg shadow-lg">
            <div className="flex-shrink-0">
              <ProfileAvatar
                name={displayName}
                image={displayImage}
                size="lg"
                isGuest={isGuest}
              />
            </div>
            <div className="ml-4">
              <div className="flex items-center">
                <p className="text-sm font-bold text-foreground">
                  {displayName}
                </p>
                {isGuest && (
                  <span className="ml-1.5 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                    게스트
                  </span>
                )}
                {isOwner && (
                  <Crown className="ml-1.5 h-5 w-5 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}
