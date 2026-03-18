'use client';

import { useEffect, useRef } from 'react';

export interface BidLogItem {
  id: string;
  teamName: string;
  amount: number;
  time: string; // HH:mm:ss
}

export function BidLog({ logs }: { logs: BidLogItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새로운 로그가 추가될 때마다 아래로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full flex flex-col rounded-lg border border-border bg-card overflow-hidden h-[300px]">
      <div className="bg-muted p-3 border-b border-border">
        <h3 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          실시간 입찰 로그
        </h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            아직 입찰이 없습니다.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-sm animate-in slide-in-from-right-2 fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                <span className="font-bold text-foreground">{log.teamName}</span>
              </div>
              <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                {log.amount} P
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
