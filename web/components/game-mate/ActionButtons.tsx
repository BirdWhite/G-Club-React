'use client';

import { GamePostStatus } from "@/types/models";
import { LogIn, CheckCircle, XCircle, Hourglass, PlusCircle } from 'lucide-react';

interface ActionButtonsProps {
  postStatus: GamePostStatus;
  isParticipating: boolean;
  isWaiting: boolean;
  isOwner?: boolean;
  onParticipate: () => void;
  onCancelParticipation: () => void;
  onWait: () => void;
  onToggleStatus?: () => void;
  loading: boolean;
}

export function ActionButtons({
  postStatus,
  isParticipating,
  isWaiting,
  isOwner = false,
  onParticipate,
  onCancelParticipation,
  onWait,
  onToggleStatus,
  loading,
}: ActionButtonsProps) {
  const commonButtonStyles = "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const disabledButtonStyles = "bg-gray-400 cursor-not-allowed";

  // 작성자인 경우 순환식 상태 버튼 표시
  if (isOwner && onToggleStatus) {
    const getStatusButtonInfo = () => {
      switch (postStatus) {
        case 'OPEN':
        case 'FULL':
          return {
            text: '게임 시작',
            icon: <LogIn className="mr-2 h-5 w-5" />,
            className: 'bg-cyber-purple hover:bg-cyber-purple/90 focus:ring-cyber-purple text-cyber-black'
          };
        case 'IN_PROGRESS':
          return {
            text: '게임 완료',
            icon: <CheckCircle className="mr-2 h-5 w-5" />,
            className: 'bg-cyber-green hover:bg-cyber-green/90 focus:ring-cyber-green text-cyber-black'
          };
        case 'COMPLETED':
          return {
            text: '모집 재개',
            icon: <PlusCircle className="mr-2 h-5 w-5" />,
            className: 'bg-cyber-blue hover:bg-cyber-blue/90 focus:ring-cyber-blue text-cyber-black'
          };
        default:
          return {
            text: '게임 시작',
            icon: <LogIn className="mr-2 h-5 w-5" />,
            className: 'bg-cyber-purple hover:bg-cyber-purple/90 focus:ring-cyber-purple text-cyber-black'
          };
      }
    };

    const buttonInfo = getStatusButtonInfo();
    
    return (
      <button
        onClick={onToggleStatus}
        disabled={loading}
        className={`${commonButtonStyles} ${buttonInfo.className}`}
      >
        {buttonInfo.icon}
        {loading ? '처리 중...' : buttonInfo.text}
      </button>
    );
  }

  if (postStatus === 'COMPLETED') {
    return (
      <button disabled className={`${commonButtonStyles} ${disabledButtonStyles}`}>
        게임 모임이 종료되었습니다.
      </button>
    );
  }

  if (postStatus === 'EXPIRED') {
    return (
      <button disabled className={`${commonButtonStyles} ${disabledButtonStyles}`}>
        모집 기간이 만료되었습니다.
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
        {loading ? '참여 중...' : '게임 참여하기'}
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
