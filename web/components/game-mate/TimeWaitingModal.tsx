'use client';

import { useState } from 'react';
import { format, addMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Clock, X } from 'lucide-react';

interface TimeWaitingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTime: string | null, isImmediateAvailable: boolean) => void;
  gameStartTime: string | Date;
  isFull: boolean;
  loading?: boolean;
}

export function TimeWaitingModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  gameStartTime, 
  isFull,
  loading = false 
}: TimeWaitingModalProps) {
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isImmediateAvailable, setIsImmediateAvailable] = useState<boolean>(false);

  if (!isOpen) return null;

  // 게임 시작 시간을 기준으로 30분 후부터 30분 간격으로 시간 옵션 생성
  const generateTimeOptions = () => {
    const startTime = typeof gameStartTime === 'string' ? new Date(gameStartTime) : gameStartTime;
    const options = [];
    
    // 30분 후부터 시작
    let currentTime = addMinutes(startTime, 30);
    
    // 최대 6시간 후까지 (12개 옵션)
    for (let i = 0; i < 12; i++) {
      options.push({
        value: currentTime.toISOString(),
        label: format(currentTime, 'HH:mm', { locale: ko }),
        fullLabel: format(currentTime, 'M월 d일 HH:mm', { locale: ko })
      });
      currentTime = addMinutes(currentTime, 30);
    }
    
    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleConfirm = () => {
    if (isImmediateAvailable || selectedTime) {
      const availableTime = isImmediateAvailable ? null : selectedTime;
      onConfirm(availableTime, isImmediateAvailable);
    }
  };

  const handleImmediateAvailableChange = (checked: boolean) => {
    setIsImmediateAvailable(checked);
    if (checked) {
      setSelectedTime(''); // 바로 참여 가능이면 시간 선택 해제
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">예비 참여</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              게임 시작 시간: <span className="font-medium text-foreground">
                {format(typeof gameStartTime === 'string' ? new Date(gameStartTime) : gameStartTime, 'M월 d일 HH:mm', { locale: ko })}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              언제부터 참여 가능한지 선택해주세요.
            </p>
          </div>

          {/* 바로 참여 가능 체크박스 */}
          <div className="mb-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isImmediateAvailable}
                onChange={(e) => handleImmediateAvailableChange(e.target.checked)}
                disabled={!isFull || loading}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <div className="flex-1">
                <span className={`text-sm font-medium ${!isFull ? 'text-muted-foreground' : 'text-foreground'}`}>
                  바로 참여 가능 (인원이 가득 찰 때만 가능)
                </span>
                {!isFull && (
                  <p className="text-xs text-muted-foreground mt-1">
                    현재 인원이 가득 차지 않아 선택할 수 없습니다.
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* 시간 선택 */}
          <div className="space-y-2 mb-6">
            <label className="text-sm font-medium text-foreground">참여 가능 시간</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTime(option.value)}
                  disabled={loading || isImmediateAvailable}
                  className={`p-3 text-sm rounded-md border transition-colors ${
                    selectedTime === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isImmediateAvailable
                      ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-70">{option.fullLabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={(!isImmediateAvailable && !selectedTime) || loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '등록 중...' : '예비 신청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
