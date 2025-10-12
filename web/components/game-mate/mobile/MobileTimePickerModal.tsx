'use client';

import { useState } from 'react';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Picker from 'react-mobile-picker';

interface MobileTimePickerModalProps {
  isOpen: boolean;
  value?: string;
  onClose: () => void;
  onSelect: (time: string) => void;
}

export function MobileTimePickerModal({
  isOpen,
  value,
  onClose,
  onSelect,
}: MobileTimePickerModalProps) {
  // 현재 값에서 시간과 분 추출
  const initialHour = value ? parseInt(value.split(':')[0]) : 12;
  const initialMinute = value ? parseInt(value.split(':')[1]) : 0;
  
  const [pickerValue, setPickerValue] = useState({
    hour: initialHour.toString(),
    minute: initialMinute.toString(),
  });

  if (!isOpen) return null;

  const hour = parseInt(pickerValue.hour);
  const minute = parseInt(pickerValue.minute);

  // 선택 가능한 옵션들 생성
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString());
  const minuteOptions = ['0', '30'];

  // 30분씩 증가
  const increaseTime = () => {
    if (minute === 0) {
      setPickerValue({ ...pickerValue, minute: '30' });
    } else {
      const newHour = hour === 23 ? 0 : hour + 1;
      setPickerValue({ hour: newHour.toString(), minute: '0' });
    }
  };

  // 30분씩 감소
  const decreaseTime = () => {
    if (minute === 30) {
      setPickerValue({ ...pickerValue, minute: '0' });
    } else {
      const newHour = hour === 0 ? 23 : hour - 1;
      setPickerValue({ hour: newHour.toString(), minute: '30' });
    }
  };

  const handleConfirm = () => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onSelect(timeString);
    onClose();
  };

  const handleCurrentTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 현재 시간을 30분 단위로 올림
    let nextMinute = 0;
    let nextHour = currentHour;
    
    if (currentMinute > 30) {
      nextMinute = 0;
      nextHour = currentHour + 1;
      if (nextHour === 24) {
        nextHour = 0;
      }
    } else if (currentMinute > 0) {
      nextMinute = 30;
    }
    
    setPickerValue({
      hour: nextHour.toString(),
      minute: nextMinute.toString(),
    });
  };

  // 시간 포맷팅 (오전/오후)
  const formatTime = () => {
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${period} ${displayHour}:${minute.toString().padStart(2, '0')}`;
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
          시간 선택
        </h2>
        
        <Button
          onClick={handleConfirm}
          size="sm"
          className="px-4 py-2"
        >
          <Check className="h-4 w-4 mr-1" />
          확인
        </Button>
      </div>

      {/* 선택된 시간 표시 */}
      <div className="flex-shrink-0 bg-primary/10 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">선택된 시간</p>
        <p className="text-3xl font-bold text-foreground">
          {formatTime()}
        </p>
      </div>

      {/* 시간 선택 UI */}
      <div className="flex-1 flex flex-col items-center p-4 pt-8">
        {/* 화살표와 휠 피커 */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={decreaseTime}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-lg"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* react-mobile-picker 사용 */}
          <div className="relative">
            <Picker
              value={pickerValue}
              onChange={setPickerValue}
              wheelMode="normal"
              height={216}
              itemHeight={60}
            >
              {/* 시간 휠 */}
              <Picker.Column name="hour">
                {hourOptions.map((option) => (
                  <Picker.Item key={option} value={option}>
                    {({ selected }) => (
                      <div className={`flex items-center justify-center h-[60px] transition-all ${
                        selected 
                          ? 'text-foreground scale-110 font-bold' 
                          : 'text-muted-foreground opacity-50'
                      }`}>
                        <span className="text-3xl tabular-nums">
                          {option.padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>

              {/* 구분자 */}
              <div className="w-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">:</span>
              </div>

              {/* 분 휠 */}
              <Picker.Column name="minute">
                {minuteOptions.map((option) => (
                  <Picker.Item key={option} value={option}>
                    {({ selected }) => (
                      <div className={`flex items-center justify-center h-[60px] transition-all ${
                        selected 
                          ? 'text-foreground scale-110 font-bold' 
                          : 'text-muted-foreground opacity-50'
                      }`}>
                        <span className="text-3xl tabular-nums">
                          {option.padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            </Picker>

            {/* 선택 표시 오버레이 */}
            <div className="absolute top-1/2 left-0 right-0 h-[60px] -translate-y-1/2 border-y-2 border-primary/30 pointer-events-none rounded-lg" />
          </div>

          <button
            onClick={increaseTime}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-lg"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>

        <p className="text-sm text-foreground/70 mb-6 text-center px-4">
          숫자를 스크롤하거나 화살표를 눌러 시간을 선택하세요
        </p>

        {/* 현재 시간 버튼 */}
        <Button
          variant="outline"
          onClick={handleCurrentTime}
          className="w-full max-w-xs bg-background border-2 border-primary/30 hover:bg-primary/10 text-foreground font-semibold"
        >
          현재 시간 기준으로 설정
        </Button>
      </div>
    </div>
  );
}
