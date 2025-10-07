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
  
  const commonButtonStyles = "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const disabledButtonStyles = "bg-gray-400 cursor-not-allowed";


  // 예비 참여자가 참여 제안을 받은 경우 승낙/거절 버튼 표시 (최우선)
  if (waitingList.some(w => w.id && w.status === 'INVITED')) {
    const invitedWaiting = waitingList.find(w => w.id && w.status === 'INVITED');
    if (invitedWaiting) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">게임 참가 제안</h3>
            <p className="text-sm text-muted-foreground mb-4">
              빈자리가 발생했습니다. 게임에 참가하시겠습니까?
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
                className={`${commonButtonStyles} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`}
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
                className={`${commonButtonStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`}
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
        className={`${commonButtonStyles} text-white ${buttonInfo.className}`}
      >
        {buttonInfo.icon}
        {loading ? '처리 중...' : buttonInfo.text}
      </button>
    );
  }

  if (postStatus === 'COMPLETED') {
    return (
      <button disabled className={`${commonButtonStyles} text-white ${disabledButtonStyles}`}>
        게임 모임이 종료되었습니다.
      </button>
    );
  }

  if (postStatus === 'EXPIRED') {
    return (
      <button disabled className={`${commonButtonStyles} text-white ${disabledButtonStyles}`}>
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
          className={`${commonButtonStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`}
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
          className={`${commonButtonStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`}
        >
          <XCircle className="mr-2 h-5 w-5" />
          {loading ? '취소 중...' : '참여 취소하기'}
        </button>
      );
    }
  }

  // 예비 신청 중인 경우 취소 버튼 표시 (게임 참가 버튼과 함께)
  let waitingCancelButton = null;
  if (isWaiting) {
    const waitingParticipant = waitingList.find(w => w.id && w.status !== 'CANCELED');
    
    // waitingList가 비어있어도 isWaiting이 true면 예비 신청 중으로 간주
    if (waitingParticipant || waitingList.length === 0) {
      waitingCancelButton = (
        <button
          onClick={async () => {
            try {
              let response;
              if (waitingParticipant?.id) {
                // waitingParticipant가 있으면 ID로 취소
                response = await fetch(`/api/game-posts/${gamePostId}/waiting/${waitingParticipant.id}/cancel`, {
                  method: 'POST',
                });
              } else {
                // waitingParticipant가 없으면 게임 포스트 ID로 취소 (새로운 API 필요)
                response = await fetch(`/api/game-posts/${gamePostId}/wait/cancel`, {
                  method: 'POST',
                });
              }
              
              const data = await response.json();
              if (response.ok) {
                toast.success(data.message || '예비 참여가 취소되었습니다.');
                onWaitingListUpdate?.();
              } else {
                toast.error(data.error || '예비 참여 취소 중 오류가 발생했습니다.');
              }
            } catch {
              toast.error('예비 참여 취소 중 오류가 발생했습니다.');
            }
          }}
          disabled={loading}
          className={`${commonButtonStyles} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500`}
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
          className={`${commonButtonStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`}
        >
          <Hourglass className="mr-2 h-5 w-5" />
          {loading ? '등록 중...' : '예비 신청'}
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
  if (!isFull && !isParticipating && (postStatus === 'OPEN' || postStatus === 'IN_PROGRESS')) {
    return (
      <>
        <div className={(waitingCancelButton || (!isWaiting && !isFull)) ? "grid grid-cols-2 gap-2" : "space-y-2"}>
          {waitingCancelButton}
          {!isWaiting && (
            <button
              onClick={() => setIsTimeWaitingModalOpen(true)}
              disabled={loading}
              className={`${commonButtonStyles} bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500`}
            >
              <Clock className="mr-2 h-5 w-5" />
              예비 신청
            </button>
          )}
          <button
            onClick={onParticipate}
            disabled={loading}
            className={`${commonButtonStyles} bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            {loading ? '참여 중...' : '게임 참가'}
          </button>
        </div>
        
        <TimeWaitingModal
          isOpen={isTimeWaitingModalOpen}
          onClose={() => setIsTimeWaitingModalOpen(false)}
          onConfirm={(selectedTime, isImmediateAvailable) => {
            const availableTime = isImmediateAvailable ? null : selectedTime;
            onWait(availableTime);
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
