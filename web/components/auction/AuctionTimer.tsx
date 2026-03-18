'use client';

import { useEffect, useState } from 'react';

interface AuctionTimerProps {
  endTimeMs: number | null; // null이면 중지 상태
  onExpire?: () => void;
  isExtension?: boolean; // 연장 타이머인지 여부 (UI 스타일링용)
}

export function AuctionTimer({ endTimeMs, onExpire, isExtension = false }: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (endTimeMs === null) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeMs - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 100); // 0.1초마다 체크하여 정확도 높임

    return () => clearInterval(interval);
  }, [endTimeMs, onExpire]);

  if (timeLeft === null) {
    return (
      <div className="w-full h-16 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
        <span className="text-muted-foreground font-medium">타이머 대기 중</span>
      </div>
    );
  }

  const isWarning = timeLeft <= 5 && timeLeft > 0;
  const isExpired = timeLeft === 0;

  return (
    <div 
      className={`w-full h-20 rounded-lg flex flex-col items-center justify-center border-2 transition-colors
        ${isExpired ? 'bg-destructive/10 border-destructive text-destructive' : 
          isWarning ? 'bg-orange-500/10 border-orange-500 text-orange-500 animate-pulse' : 
          isExtension ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 
          'bg-card border-border text-foreground'
        }
      `}
    >
      <div className="text-4xl font-black font-mono tracking-wider tabular-nums">
        {timeLeft}.0
      </div>
      <div className="text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
        {isExpired ? 'TIME UP' : isExtension ? 'EXTENSION TIME' : 'BASE TIME'}
      </div>
    </div>
  );
}
