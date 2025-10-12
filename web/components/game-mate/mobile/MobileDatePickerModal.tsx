'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { ko } from 'date-fns/locale';
import { format } from 'date-fns';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileDatePickerModalProps {
  isOpen: boolean;
  value?: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

export function MobileDatePickerModal({
  isOpen,
  value,
  onClose,
  onSelect,
}: MobileDatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect(selectedDate);
      onClose();
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent transition-colors"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        
        <h2 className="text-lg font-semibold text-foreground">
          날짜 선택
        </h2>
        
        <Button
          onClick={handleConfirm}
          disabled={!selectedDate}
          size="sm"
          className="px-4 py-2"
        >
          <Check className="h-4 w-4 mr-1" />
          확인
        </Button>
      </div>

      {/* 선택된 날짜 표시 */}
      <div className="flex-shrink-0 bg-primary/10 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">선택된 날짜</p>
        <p className="text-2xl font-bold text-foreground">
          {selectedDate ? format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko }) : "날짜를 선택하세요"}
        </p>
      </div>

      {/* 달력 - flex-1 제거, 절대 위치 사용 */}
      <div className="absolute top-[164px] left-0 right-0 bottom-0 overflow-y-auto p-4 pt-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) =>
              date < new Date(new Date().setHours(0, 0, 0, 0))
            }
            initialFocus
            locale={ko}
            className="w-full scale-110"
          />
          
          {/* 오늘로 설정 버튼 */}
          <Button
            variant="outline"
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
            }}
            className="w-full bg-background border-2 border-primary/30 hover:bg-primary/10 text-foreground font-semibold"
          >
            오늘로 설정
          </Button>
        </div>
      </div>
    </div>
  );
}
