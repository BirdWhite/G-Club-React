'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface MobileTimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MobileTimePicker({
  value,
  onChange,
  placeholder = "시간 선택",
  className,
  disabled = false
}: MobileTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  // Hydration 오류 방지를 위한 마운트 체크
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // 현재 값에서 시간과 분 추출
  const currentHour = value ? parseInt(value.split(':')[0]) : 0;
  const currentMinute = value ? parseInt(value.split(':')[1]) : 0;

  // 시간 선택 처리
  const handleHourChange = (hour: string) => {
    const newTime = `${hour.padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    onChange?.(newTime);
  };

  // 분 선택 처리
  const handleMinuteChange = (minute: string) => {
    const newTime = `${currentHour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
    onChange?.(newTime);
  };

  // 현재 시간에서 가장 가까운 30분 단위 시간 계산
  const getCurrentTimeSlot = () => {
    if (typeof window === 'undefined') {
      return '00:00';
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let nextMinute = currentMinute;
    if (currentMinute > 30) {
      nextMinute = 0;
      return `${(currentHour + 1).toString().padStart(2, '0')}:00`;
    } else if (currentMinute > 0) {
      nextMinute = 30;
    }
    
    return `${currentHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full py-3 px-0 text-base font-medium text-foreground border-b border-border bg-transparent focus:outline-none focus:border-primary transition-colors"
            disabled={disabled}
          >
            <span className="truncate">
              {isMounted ? (value || placeholder) : placeholder}
            </span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">시간</label>
                <Select value={currentHour.toString()} onValueChange={handleHourChange}>
                  <SelectTrigger className="w-20 bg-cyber-black-100 border-cyber-black-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-lg font-medium mt-6">:</div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">분</label>
                <Select value={currentMinute.toString()} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="w-20 bg-cyber-black-100 border-cyber-black-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">00</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange?.(getCurrentTimeSlot());
                  setIsOpen(false);
                }}
                className="w-full"
              >
                현재 시간 기준
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
