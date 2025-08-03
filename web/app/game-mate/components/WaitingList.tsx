'use client';

import React from 'react';
import type { WaitingParticipant } from '@/types/models';
import Image from 'next/image';
import { Clock } from 'lucide-react';

interface WaitingListProps {
  waitingList: WaitingParticipant[];
}

const WaitingList: React.FC<WaitingListProps> = ({ waitingList }) => {
  if (!waitingList || waitingList.length === 0) return null;

  return (
    <div className="space-y-3">
      {waitingList.map((participant) => (
        <div key={participant.id} className="flex items-center justify-between p-3 bg-cyber-black-200 border border-cyber-black-300 rounded-lg shadow-lg">
          <div className="flex items-center">
            <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-white p-0.5">
              <Image
                src={participant.user.image || '/images/default-profile.png'}
                alt={participant.user.name || '프로필'}
                fill
                sizes="48px"
                className="object-cover rounded-full"
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-bold text-cyber-gray">
                {participant.user.name || '익명'}
              </p>
              {participant.availableTime && (
                <div className="flex items-center text-xs text-cyber-gray/60 mt-1">
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
