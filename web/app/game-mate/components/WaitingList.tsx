'use client';

import React from 'react';
import type { WaitingParticipant } from '@/types/models';
import { Clock } from 'lucide-react';
import ProfileAvatar from '@/components/common/ProfileAvatar';

interface WaitingListProps {
  waitingList: WaitingParticipant[];
}

const WaitingList: React.FC<WaitingListProps> = ({ waitingList }) => {
  if (!waitingList || waitingList.length === 0) return null;

  return (
    <div className="space-y-3">
      {waitingList.map((participant) => (
        <div key={participant.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ProfileAvatar
                name={participant.user.name}
                image={participant.user.image}
                size="lg"
                unoptimized={participant.user.image?.includes('127.0.0.1')}
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-bold text-foreground">
                {participant.user.name || '익명'}
              </p>
              {participant.availableTime && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{participant.availableTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WaitingList;
