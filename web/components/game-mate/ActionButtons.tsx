'use client';

import { useState } from 'react';
import { GamePostStatus, WaitingParticipant } from "@/types/models";
import { LogIn, CheckCircle, XCircle, Hourglass, PlusCircle, Check, X, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TimeWaitingModal } from './TimeWaitingModal';

interface ActionButtonsProps {
  postStatus: GamePostStatus;
  isFull: boolean;
  isParticipating: boolean;
  isWaiting: boolean;
  isOwner?: boolean;
  gamePostId?: string;
  gameStartTime?: string | Date;
  waitingList?: WaitingParticipant[];
  onParticipate: () => void;
  onCancelParticipation: () => void;
  onLeaveEarly?: () => void;
  onWait: (availableTime: string | null) => void;
  onToggleStatus?: () => void;
  onWaitingListUpdate?: () => void;
  loading: boolean;
}

export function ActionButtons({
  postStatus,
  isFull,
  isParticipating,
  isWaiting,
  isOwner = false,
  gamePostId,
  gameStartTime,
  waitingList = [],
  onParticipate,
  onCancelParticipation,
  onLeaveEarly,
  onWait,
  onToggleStatus,
  onWaitingListUpdate,
  loading,
}: ActionButtonsProps) {
  const [isTimeWaitingModalOpen, setIsTimeWaitingModalOpen] = useState(false);
  const commonButtonStyles = "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const disabledButtonStyles = "bg-gray-400 cursor-not-allowed";


  // 예비 참여자가 참여 제안을 받은 경우 승낙/거절 버튼 표시
  if (waitingList.some(w => w.id && w.status === 'INVITED')) {
    const invitedWaiting = waitingList.find(w => w.id && w.status === 'INVITED');
    if (invitedWaiting) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">게임 참여 제안</h3>
            <p className="text-sm text-muted-foreground mb-4">
              빈자리가 발생했습니다. 게임에 참여하시겠습니까?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={async () => {
                  if (!invitedWaiting.id) return;
                  try {
                    const response = await fetch(`/api/game-posts/${gamePostId}/waiting/${invitedWaiting.id}/accept`, {
                      method: 'POST',
                    });
                    const data = await response.json();
                    if (response.ok) {
                      toast.success(data.message);
                      onWaitingListUpdate?.();
                    } else {
                      toast.error(data.error);
                    }
                  } catch {
                    toast.error('참여 승낙 중 오류가 발생했습니다.');
                  }
                }}
                disabled={loading}
                className={`${commonButtonStyles} bg-green-600 hover:bg-green-700 focus:ring-green-500`}
              >
                <Check className="mr-2 h-5 w-5" />
                {loading ? '처리 중...' : '참여하기'}
              </button>
              <button
                onClick={async () => {
                  if (!invitedWaiting.id) return;
                  try {
                    const response = await fetch(`/api/game-posts/${gamePostId}/waiting/${invitedWaiting.id}/cancel`, {
                      method: 'POST',
                    });
                    const data = await response.json();
                    if (response.ok) {
                      toast.success(data.message);
                      onWaitingListUpdate?.();
                    } else {
                      toast.error(data.error);
                    }
                  } catch {
                    toast.error('참여 거절 중 오류가 발생했습니다.');
                  }
                }}
                disabled={loading}
                className={`${commonButtonStyles} bg-red-600 hover:bg-red-700 focus:ring-red-500`}
              >
                <X className="mr-2 h-5 w-5" />
                {loading ? '처리 중...' : '거절하기'}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 작성자인 경우 순환식 상태 버튼 표시
  if (isOwner && onToggleStatus) {
    const getStatusButtonInfo = () => {
      switch (postStatus) {
        case 'OPEN':
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
    // 게임 중일 때는 퇴장 버튼, 다른 상태일 때는 참여 취소 버튼
    if (postStatus === 'IN_PROGRESS') {
      return (
        <button
          onClick={onLeaveEarly}
          disabled={loading}
          className={`${commonButtonStyles} bg-red-600 hover:bg-red-700 focus:ring-red-500`}
        >
          <XCircle className="mr-2 h-5 w-5" />
          {loading ? '퇴장 중...' : '퇴장하기'}
        </button>
      );
    } else {
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
  }

  // WAITING 상태인 경우 취소 버튼만 표시
  if (isWaiting && !waitingList.some(w => w.id && w.status === 'INVITED')) {
    const waitingParticipant = waitingList.find(w => w.id && w.status === 'WAITING');
    
    if (waitingParticipant) {
      return (
        <button
          onClick={async () => {
            if (!waitingParticipant.id) return;
            try {
              const response = await fetch(`/api/game-posts/${gamePostId}/waiting/${waitingParticipant.id}/cancel`, {
                method: 'POST',
              });
              const data = await response.json();
              if (response.ok) {
                toast.success(data.message);
                onWaitingListUpdate?.();
              } else {
                toast.error(data.error);
              }
            } catch {
              toast.error('예비 참여 취소 중 오류가 발생했습니다.');
            }
          }}
          disabled={loading}
          className={`${commonButtonStyles} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}
        >
          <X className="mr-2 h-5 w-5" />
          {loading ? '취소 중...' : '예비 참여 취소'}
        </button>
      );
    }
  }

  // 예비 참여 가능한 상태 (가득 찬 경우)
  if (isFull && !isParticipating && !isWaiting) {
    return (
      <>
        <button
          onClick={() => setIsTimeWaitingModalOpen(true)}
          disabled={loading}
          className={`${commonButtonStyles} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
        >
          <Hourglass className="mr-2 h-5 w-5" />
          {loading ? '등록 중...' : '예비 참가 신청'}
        </button>
        
        <TimeWaitingModal
          isOpen={isTimeWaitingModalOpen}
          onClose={() => setIsTimeWaitingModalOpen(false)}
          onConfirm={(selectedTime, isImmediateAvailable) => {
            onWait(isImmediateAvailable ? null : selectedTime);
            setIsTimeWaitingModalOpen(false);
          }}
          gameStartTime={gameStartTime || new Date()}
          isFull={isFull}
          loading={loading}
        />
      </>
    );
  }

  // 빈자리가 있지만 예비 참가도 가능한 경우
  if (!isFull && !isParticipating && !isWaiting && (postStatus === 'OPEN' || postStatus === 'IN_PROGRESS')) {
    return (
      <>
        <div className="space-y-2">
          <button
            onClick={onParticipate}
            disabled={loading}
            className={`${commonButtonStyles} bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500`}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            {loading ? '참여 중...' : '게임 참여하기'}
          </button>
          <button
            onClick={() => setIsTimeWaitingModalOpen(true)}
            disabled={loading}
            className={`${commonButtonStyles} bg-orange-600 hover:bg-orange-700 focus:ring-orange-500`}
          >
            <Clock className="mr-2 h-5 w-5" />
            예비 참가 신청
          </button>
        </div>
        
        <TimeWaitingModal
          isOpen={isTimeWaitingModalOpen}
          onClose={() => setIsTimeWaitingModalOpen(false)}
          onConfirm={(selectedTime, isImmediateAvailable) => {
            onWait(isImmediateAvailable ? null : selectedTime);
            setIsTimeWaitingModalOpen(false);
          }}
          gameStartTime={gameStartTime || new Date()}
          isFull={isFull}
          loading={loading}
        />
      </>
    );
  }

  return null;
}
