'use client';

export function AuctionSkeleton() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col p-4 gap-4 animate-pulse select-none">
      {/* Header Skeleton */}
      <div className="w-full h-24 bg-card border border-border rounded-2xl flex flex-col items-center justify-center p-4 gap-2">
        <div className="w-48 h-8 bg-muted rounded-lg" />
        <div className="w-full max-w-md h-2 bg-muted rounded-full" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column Skeleton */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="flex-1 bg-background/50 rounded-xl border border-border/40" />
          </div>
          <div className="flex-1 bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="w-32 h-4 bg-muted rounded" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full h-10 bg-muted/70 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Center Column Skeleton */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="w-40 h-6 bg-muted rounded" />
            <div className="flex-1 bg-background/40 border border-border rounded-xl p-4" />
          </div>
          <div className="h-44 bg-card border border-border rounded-2xl p-4 flex items-center justify-center" />
          <div className="h-28 bg-card border border-border rounded-2xl" />
        </div>

        {/* Right Column Skeleton */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="w-36 h-4 bg-muted rounded" />
            <div className="flex-1 space-y-2 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center h-8 bg-muted/70 rounded px-2">
                  <div className="w-16 h-3 bg-muted rounded" />
                  <div className="w-12 h-4 bg-muted/70 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
