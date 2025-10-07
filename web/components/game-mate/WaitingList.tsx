'use client';

import React from 'react';
import type { WaitingParticipant } from '@/types/models';
import { Clock } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';

interface WaitingListProps {
  waitingList: WaitingParticipant[];
}

const WaitingList: React.FC<WaitingListProps> = ({ waitingList }) => {
  if (!waitingList || waitingList.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {waitingList.map((participant) => {
        const isInvited = participant.status === 'INVITED';
        // const isTimeWaiting = participant.status === 'TIME_WAITING'; // 현재 미사용
        
        return (
          <div key={participant.id} className="flex items-center p-3 bg-card border border-border rounded-lg shadow-lg">
            <div className="flex-shrink-0">
              <ProfileAvatar
                name={participant.user.name}
                image={participant.user.image}
                size="md"
                unoptimized={participant.user.image?.includes('127.0.0.1')}
              />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground">
                  {participant.user.name || '익명'}
                </p>
                {isInvited && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex-shrink-0">
                    초대됨
                  </span>
                )}
              </div>
              {participant.availableTime && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {(() => {
                      const date = new Date(participant.availableTime);
                      if (isToday(date)) {
                        return format(date, 'HH:mm', { locale: ko });
                      } else if (isTomorrow(date)) {
                        return `내일 ${format(date, 'HH:mm', { locale: ko })}`;
                      } else {
                        return format(date, 'M월 d일 HH:mm', { locale: ko });
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { WaitingList };
