'use client';

import Link from 'next/link';
import { Gamepad2, ChevronLeft } from 'lucide-react';

export function DeletedGamePostMessage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          삭제된 게임메이트 글입니다.
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          해당 글이 삭제되어 더 이상 볼 수 없습니다.
        </p>
        <Link
          href="/game-mate"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          게임메이트 목록으로
        </Link>
      </div>
    </div>
  );
}
