'use client';

import React from 'react';
import { User } from '@prisma/client';

interface Participant {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface WaitingListProps {
  waitingList: Participant[];
  isLeader: boolean;
  onApprove: (participantId: string) => Promise<void>;
  onReject: (participantId: string) => Promise<void>;
}

const WaitingList: React.FC<WaitingListProps> = ({ waitingList, isLeader, onApprove, onReject }) => {
  if (waitingList.length === 0) return null;

  return (
    <div className="mt-8 bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">대기 중인 참가자 ({waitingList.length}명)</h3>
      <div className="space-y-3">
        {waitingList.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {participant.user.image ? (
                  <img 
                    className="h-10 w-10 rounded-full" 
                    src={participant.user.image} 
                    alt={participant.user.name || '프로필 이미지'} 
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">
                      {participant.user.name?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {participant.user.name || '익명'}
                </p>
              </div>
            </div>
            {isLeader && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onApprove(participant.id)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  승인
                </button>
                <button
                  onClick={() => onReject(participant.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  거절
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WaitingList;
