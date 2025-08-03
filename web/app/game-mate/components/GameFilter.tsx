'use client';

import { useState } from 'react';
import { GameSearchSelect } from '@/components/ui/game-search-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed';

interface GameFilterProps {
  selectedGame: string;
  statusFilter: StatusFilterType;
  searchTerm: string;
  onGameChange: (gameId: string) => void;
  onStatusChange: (status: StatusFilterType) => void;
  onSearch: (term: string) => void;
}

export default function GameFilter({
  selectedGame,
  statusFilter,
  searchTerm,
  onGameChange,
  onStatusChange,
  onSearch,
}: GameFilterProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // 게임 검색 필터링 로직 제거

  // 검색어 변경 핸들러
  const handleSearchChange = (term: string) => {
    setLocalSearchTerm(term);
    onSearch(term);
  };

  // 게임 선택 핸들러
  const handleGameSelect = (gameId: string) => {
    onGameChange(gameId);
  };

  // 상태 필터 선택 핸들러
  const handleStatusSelect = (status: string) => {
    console.log('상태 필터 선택:', status);
    onStatusChange(status as StatusFilterType);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4">
        {/* 게임 선택 드롭다운 */}
        <div className="flex-1 md:max-w-md">
          <GameSearchSelect
            value={selectedGame}
            onChange={handleGameSelect}
            placeholder="게임 선택"
            showAllOption={true}
          />
        </div>

        {/* 상태 필터 드롭다운 */}
        <div className="w-full md:w-40">
          <Select value={statusFilter} onValueChange={handleStatusSelect}>
            <SelectTrigger className="w-full bg-cyber-black-100 border-cyber-black-300 hover:bg-cyber-black-200">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent className="bg-cyber-black-200 border-cyber-black-300">
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="recruiting">모집 중</SelectItem>
              <SelectItem value="open">자리 있음</SelectItem>
              <SelectItem value="full">가득 참</SelectItem>
              <SelectItem value="completed">완료됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}