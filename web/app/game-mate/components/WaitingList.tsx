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
        <div key={participant.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={participant.user.image || '/images/default-profile.png'}
                alt={participant.user.name || '프로필'}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-bold text-gray-900">
                {participant.user.name || '익명'}
              </p>
              {participant.availableTime && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
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
