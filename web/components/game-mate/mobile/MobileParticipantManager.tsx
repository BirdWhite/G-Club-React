'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserSearchSelect, UserSearchResult } from '../UserSearchSelect';

export interface Participant {
  id?: string;
  name: string;
  userId?: string;
  email?: string | null;
  note?: string;
}

interface MobileParticipantManagerProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
  maxParticipants: number;
  disabled?: boolean;
}

export function MobileParticipantManager({ 
  participants, 
  onChange, 
  maxParticipants,
  disabled = false 
}: MobileParticipantManagerProps) {

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
    <>
      <div className="">
        <div className="flex items-center text-foreground mb-1">
          <Users className="h-5 w-5 mr-2" />
          <h3 className="font-semibold">참여자 관리</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          미리 참여자를 추가하거나 수정할 수 있습니다. ({participants.length}/{maxParticipants}명)
        </p>
      </div>
      
      <div className="space-y-4">
        {/* 참여자 추가 폼 */}
        <div>
            <Label>사용자 검색</Label>
            <UserSearchSelect
              onUserSelect={handleUserSelect}
              disabled={disabled || participants.length >= maxParticipants}
              placeholder="참여할 사용자 이름을 검색하세요"
            />
        </div>

        {/* 참여자 목록 */}
        {participants.length > 0 && (
          <div className="space-y-2">
            <Label>현재 참여자</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {participants.map((participant, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{participant.name}</div>
                        {/* 실존 유저의 경우 이메일 표시 */}
                        {participant.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={participant.email}>
                            {participant.email}
                          </div>
                        )}
                        {/* 게스트 유저의 경우 표시 */}
                        {!participant.userId && participant.note === '게스트 참여자' && (
                          <div className="text-xs text-chart-4">
                            게스트 참여자
                          </div>
                        )}
                        {/* 작성자 표시 */}
                        {participant.note === '작성자' && (
                          <div className="text-xs text-primary">
                            작성자
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 작성자는 삭제할 수 없도록 X 버튼 숨김 */}
                  {participant.note !== '작성자' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeParticipant(index)}
                      disabled={disabled}
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
