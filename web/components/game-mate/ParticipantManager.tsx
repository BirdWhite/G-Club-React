'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserSearchSelect } from '@/components/game-mate/UserSearchSelect';
import type { UserSearchResult } from './UserSearchSelect';

export interface Participant {
  id?: string;
  name: string;
  userId?: string;
  email?: string | null;
  note?: string;
}

interface ParticipantManagerProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
  maxParticipants: number;
  disabled?: boolean;
}

export function ParticipantManager({ 
  participants, 
  onChange, 
  maxParticipants,
  disabled = false 
}: ParticipantManagerProps) {

  const handleUserSelect = (user: UserSearchResult) => {
    if (participants.length >= maxParticipants) {
      toast.error(`최대 ${maxParticipants}명까지만 추가할 수 있습니다.`);
      return;
    }

    // 중복 사용자 체크 (게스트 사용자는 이름으로 체크)
    if (user.isGuest) {
      if (participants.some(p => p.name === user.name)) {
        toast.error('이미 추가된 참여자입니다.');
        return;
      }
    } else {
      if (participants.some(p => p.userId === user.userId)) {
        toast.error('이미 추가된 사용자입니다.');
        return;
      }
    }

    const participant: Participant = {
      name: user.name,
      userId: user.isGuest ? undefined : (user.userId || undefined),
      email: user.isGuest ? undefined : (user.email || undefined),
      note: user.isGuest ? '게스트 참여자' : ''
    };

    onChange([...participants, participant]);
    toast.success(user.isGuest ? '게스트 참여자가 추가되었습니다.' : '참여자가 추가되었습니다.');
  };

  const removeParticipant = (index: number) => {
    const updatedParticipants = participants.filter((_, i) => i !== index);
    onChange(updatedParticipants);
    toast.success('참여자가 제거되었습니다.');
  };


  return (
    <div className="border-t border-border pt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center">
          <Users className="h-5 w-5 mr-2 text-foreground" />
          참여자 관리
          <span className="text-sm font-normal text-muted-foreground ml-2">
            {participants.length}/{maxParticipants}명
          </span>
        </h3>
      </div>

      <div className="space-y-6">
        {/* 참여자 추가 폼 */}
        <UserSearchSelect
          onUserSelect={handleUserSelect}
          disabled={disabled || participants.length >= maxParticipants}
          placeholder="참여할 사용자 이름을 검색하세요"
        />

        {/* 참여자 목록 */}
        {participants.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">현재 참여자</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {participants.map((participant, index) => {
                const isAuthor = participant.note === '작성자';
                const isGuest = !participant.userId && participant.note === '게스트 참여자';
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-card rounded-xl"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-semibold text-sm text-foreground truncate">{participant.name}</div>
                      {participant.email && (
                        <div className="text-xs text-muted-foreground truncate" title={participant.email}>
                          {participant.email}
                        </div>
                      )}
                      {isGuest && (
                        <div className="text-xs text-amber-500 font-medium mt-0.5">
                          게스트 참여자
                        </div>
                      )}
                      {isAuthor && (
                        <div className="text-xs text-primary font-medium mt-0.5">
                          작성자
                        </div>
                      )}
                    </div>
                    {/* 작성자는 삭제할 수 없도록 X 버튼 숨김 */}
                    {!isAuthor && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeParticipant(index)}
                        disabled={disabled}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10 border-0 rounded-lg flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
