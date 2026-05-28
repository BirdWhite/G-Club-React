'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function WebSocketStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950/60 border border-zinc-800 rounded-full shadow-inner select-none">
      <span className="relative flex h-2.5 w-2.5">
        {isOnline ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </>
        ) : (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </>
        )}
      </span>
      <span className="text-[11px] font-bold tracking-wide uppercase text-zinc-400 flex items-center gap-1 font-mono">
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400 inline" />
            <span>Realtime Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-400 inline animate-bounce" />
            <span className="text-rose-400">Offline</span>
          </>
        )}
      </span>
    </div>
  );
}
