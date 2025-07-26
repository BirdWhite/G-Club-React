'use client';

import { GamePostStatus } from "@/types/models";
import { LogIn, CheckCircle, XCircle, Hourglass, PlusCircle } from 'lucide-react';

interface ActionButtonsProps {
  postStatus: GamePostStatus;
  isParticipating: boolean;
  isWaiting: boolean;
  onParticipate: () => void;
  onCancelParticipation: () => void;
  onWait: () => void;
  loading: boolean;
}

export default function ActionButtons({
  postStatus,
  isParticipating,
  isWaiting,
  onParticipate,
  onCancelParticipation,
  onWait,
  loading,
}: ActionButtonsProps) {
  const commonButtonStyles = "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const disabledButtonStyles = "bg-gray-400 cursor-not-allowed";

  if (postStatus === 'COMPLETED') {
    return (
      <button disabled className={`${commonButtonStyles} ${disabledButtonStyles}`}>
        게임 모임이 종료되었습니다.
      </button>
    );
  }

  if (isParticipating) {
    return (
      <button
        onClick={onCancelParticipation}
        disabled={loading}
        className={`${commonButtonStyles} bg-red-600 hover:bg-red-700 focus:ring-red-500`}
      >
        <XCircle className="mr-2 h-5 w-5" />
        {loading ? '취소 중...' : '참여 취소하기'}
      </button>
    );
  }

  if (isWaiting) {
    return (
      <button disabled className={`${commonButtonStyles} bg-blue-500`}>
        <Hourglass className="mr-2 h-5 w-5" />
        예비 명단에 등록됨
      </button>
    );
  }

  if (postStatus === 'OPEN') {
    return (
      <button
        onClick={onParticipate}
        disabled={loading}
        className={`${commonButtonStyles} bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500`}
      >
        <PlusCircle className="mr-2 h-5 w-5" />
        {loading ? '신청 중...' : '참여 신청하기'}
      </button>
    );
  }
  
  if (postStatus === 'FULL') {
    return (
      <button
        onClick={onWait}
        disabled={loading}
        className={`${commonButtonStyles} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
      >
        <Hourglass className="mr-2 h-5 w-5" />
        {loading ? '등록 중...' : '예비 명단에 등록'}
      </button>
    );
  }

  return null;
}
