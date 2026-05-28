'use client';

export function AuctionSkeleton() {
  return (
    <div className="w-full min-h-screen bg-zinc-950 text-white flex flex-col p-4 gap-4 animate-pulse select-none">
      {/* Header Skeleton */}
      <div className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 gap-2">
        <div className="w-48 h-8 bg-zinc-800 rounded-lg" />
        <div className="w-full max-w-md h-2 bg-zinc-800 rounded-full" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column Skeleton */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="w-24 h-4 bg-zinc-800 rounded" />
            <div className="flex-1 bg-zinc-950/50 rounded-xl border border-zinc-800/40" />
          </div>
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="w-32 h-4 bg-zinc-800 rounded" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full h-10 bg-zinc-850 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Center Column Skeleton */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="w-40 h-6 bg-zinc-800 rounded" />
            <div className="flex-1 bg-zinc-950/40 border border-zinc-800 rounded-xl p-4" />
          </div>
          <div className="h-44 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-center" />
          <div className="h-28 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        </div>

        {/* Right Column Skeleton */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="w-36 h-4 bg-zinc-800 rounded" />
            <div className="flex-1 space-y-2 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center h-8 bg-zinc-850 rounded px-2">
                  <div className="w-16 h-3 bg-zinc-800 rounded" />
                  <div className="w-12 h-4 bg-zinc-850 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
