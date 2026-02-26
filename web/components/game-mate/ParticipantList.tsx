import { GameParticipant } from '@/types/models';
import { Crown, LogOut } from 'lucide-react';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

interface ParticipantListProps {
  participants: GameParticipant[];
  authorId: string;
  gamePostId: string;
  gameStatus: string;
  isOwner?: boolean;
  className?: string;
  loading?: boolean;
  onParticipantUpdate?: () => void;
}

export function ParticipantList({ 
  participants, 
  authorId, 
  gamePostId,
  gameStatus,
  isOwner = false,
  loading = false,
  onParticipantUpdate
}: ParticipantListProps) {
  const [leavingParticipantId, setLeavingParticipantId] = useState<string | null>(null);

  const handleLeaveEarly = async (participantId: string) => {
    if (leavingParticipantId) return; // 이미 처리 중인 경우
    
    // 퇴장시킬 참여자 정보 찾기
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const displayName = participant.participantType === 'GUEST' 
      ? participant.guestName 
      : (participant.user?.name || '익명');
    
    // 확인 다이얼로그
    const confirmed = confirm(`정말로 "${displayName}"님을 중도 퇴장 처리하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;
    
    setLeavingParticipantId(participantId);
    
    try {
      const response = await fetch(`/api/game-posts/${gamePostId}/leave-early`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '중도 퇴장 처리 중 오류가 발생했습니다.');
      }
      
      toast.success(`${displayName}님이 중도 퇴장 처리되었습니다.`);
      onParticipantUpdate?.();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '중도 퇴장 처리 중 오류가 발생했습니다.');
    } finally {
      setLeavingParticipantId(null);
    }
  };

  // 모든 참여자 표시 (중도 퇴장자 포함)
  const filteredParticipants = participants;

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

  if (!filteredParticipants || filteredParticipants.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground bg-card border border-border rounded-lg">
        <p>아직 참여자가 없습니다.</p>
      </div>
    );
  }
  
  // 활성 참여자를 먼저, 중도 퇴장자를 뒤에 정렬 (작성자는 맨 앞)
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    // 작성자는 항상 맨 앞
    if (a.userId === authorId) return -1;
    if (b.userId === authorId) return 1;
    
    // 활성 참여자 vs 중도 퇴장자
    if (a.status === 'ACTIVE' && b.status === 'LEFT_EARLY') return -1;
    if (a.status === 'LEFT_EARLY' && b.status === 'ACTIVE') return 1;
    
    // 같은 상태 내에서는 가입 순서 유지
    return 0;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {sortedParticipants.map((participant) => {
        const isParticipantOwner = participant.userId === authorId;
        const isGuest = participant.participantType === 'GUEST';
        const isLeftEarly = participant.status === 'LEFT_EARLY';
        const canLeaveEarly = gameStatus === 'IN_PROGRESS' && isOwner && !isParticipantOwner && participant.status === 'ACTIVE';
        const displayName = isGuest ? participant.guestName : (participant.user?.name || '익명');
        const displayImage = isGuest ? null : participant.user?.image;
        const isLeaving = leavingParticipantId === participant.id;
        
        return (
          <div 
            key={participant.id} 
            className={`group relative flex items-center p-3 border border-border rounded-lg shadow-lg transition-all duration-200 ${
              isLeftEarly ? 'bg-card opacity-70' : 'bg-card'
            }`}
          >
            <div className="flex-shrink-0">
              <ProfileAvatar
                name={displayName}
                image={displayImage}
                size="md"
                isGuest={isGuest}
              />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground">
                  {displayName}
                </p>
                {isGuest && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex-shrink-0">
                    게스트
                  </span>
                )}
                {isLeftEarly && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex-shrink-0">
                    퇴장
                  </span>
                )}
                {isParticipantOwner && (
                  <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
            </div>
            
            {/* 중도 퇴장 버튼 (호버 시 카드 오른쪽에 표시) */}
            {canLeaveEarly && (
              <div className="absolute inset-0 flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 rounded-lg">
                <Button
                  size="sm"
                  onClick={() => handleLeaveEarly(participant.id)}
                  disabled={isLeaving}
                  className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLeaving ? '처리중...' : '퇴장'}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  );
}
