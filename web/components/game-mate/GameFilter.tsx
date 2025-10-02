'use client';

import React from 'react';
import { DesktopGameSearch } from '@/components/common/DesktopGameSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed_expired';

interface GameFilterProps {
  selectedGame: string;
  statusFilter: StatusFilterType;
  onGameChange: (gameId: string) => void;
  onStatusChange: (status: StatusFilterType) => void;
}

export function GameFilter({
  selectedGame,
  statusFilter,
  onGameChange,
  onStatusChange,
}: GameFilterProps) {

  // 게임 선택 핸들러
  const handleGameSelect = (gameId: string) => {
    onGameChange(gameId);
  };

  // 상태 필터 선택 핸들러
  const handleStatusSelect = (status: string) => {
    onStatusChange(status as StatusFilterType);
  };

  return (
    <div>
      <div className="flex gap-3">
        {/* 게임 선택 드롭다운 - 모바일에서 반반 나누기 */}
        <div className="flex-1">
          <DesktopGameSearch
            value={selectedGame}
            onChange={handleGameSelect}
            placeholder="게임 선택"
            showAllOption={true}
          />
        </div>

        {/* 상태 필터 드롭다운 - 모바일에서 반반 나누기 */}
        <div className="flex-1">
          <Select value={statusFilter} onValueChange={handleStatusSelect}>
            <SelectTrigger className="w-full bg-popover border-border hover:bg-popover/80 text-popover-foreground h-12 !h-12">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground py-2">
                <SelectItem value="all" className="py-4 text-base">전체</SelectItem>
                <SelectItem value="recruiting" className="py-4 text-base">모집 중</SelectItem>
                <SelectItem value="open" className="py-4 text-base">자리 있음</SelectItem>
                <SelectItem value="full" className="py-4 text-base">가득 참</SelectItem>
                <SelectItem value="completed_expired" className="py-4 text-base">완료/만료됨</SelectItem>
              </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}