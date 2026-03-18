'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getActiveAuction } from '@/app/auction/actions';

export function AuctionBanner() {
  const [activeAuction, setActiveAuction] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    getActiveAuction().then(res => {
      if (res) setActiveAuction(res);
    });
  }, []);

  if (!activeAuction) return null;

  return (
    <Link href="/auction" className="block w-full mb-6 relative overflow-hidden group rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 opacity-90 transition-opacity group-hover:opacity-100" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      
      <div className="relative px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-4 w-4 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-white" />
          </div>
          <div>
            <h3 className="text-white font-black text-xl tracking-tight shadow-sm">{activeAuction.name}</h3>
            <p className="text-white/80 font-bold text-sm tracking-wide">지금 바로 입장하여 실시간 경매를 관전하세요!</p>
          </div>
        </div>
        
        <span className="shrink-0 bg-white/20 text-white border border-white/50 px-5 py-2 rounded-full font-black text-sm tracking-widest uppercase backdrop-blur-sm group-hover:bg-white group-hover:text-red-600 transition-colors">
          입장하기 &rarr;
        </span>
      </div>
    </Link>
  );
}
