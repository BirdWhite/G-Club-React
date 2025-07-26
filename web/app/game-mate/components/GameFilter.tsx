'use client';

import { useState, useEffect, useRef } from 'react';
import GameFilterDropdown from './GameFilterDropdown';

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
  // 각 드롭다운에 개별 ref 사용
  const statusContainerRef = useRef<HTMLDivElement>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // 외부 클릭 감지 및 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 상태 필터 드롭다운 외부 클릭 감지
      if (statusContainerRef.current && !statusContainerRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const handleStatusSelect = (status: StatusFilterType) => {
    console.log('상태 필터 선택:', status);
    setIsStatusDropdownOpen(false); // 먼저 드롭다운 닫고
    onStatusChange(status); // 그 다음 상태 변경
  };

  // 상태 필터 표시 텍스트
  const getStatusFilterText = (status: StatusFilterType) => {
    switch (status) {
      case 'all':
        return '전체';
      case 'recruiting':
        return '모집 중';
      case 'open':
        return '자리 있음';
      case 'full':
        return '가득 참';
      case 'completed':
        return '완료됨';
      default:
        return '상태';
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* 게임 선택 드롭다운 */}
        <div className="flex-1">
          <GameFilterDropdown
            value={selectedGame}
            onChange={handleGameSelect}
            placeholder="게임 선택"
            showAllOption={true}
          />
        </div>

        {/* 상태 필터 드롭다운 */}
        <div className="relative w-full md:w-56" ref={statusContainerRef}>
          <button
            type="button"
            className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => {
              console.log('상태 필터 버튼 클릭');
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
            }}
          >
            {getStatusFilterText(statusFilter)}
            <svg
              className={`-mr-1 ml-2 h-5 w-5 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200">
              {/* 상태 버튼들 단순화 */}
              <div className="py-1">
                {(['all', 'recruiting', 'open', 'full', 'completed'] as StatusFilterType[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    className={`w-full text-left px-4 py-2 text-sm ${statusFilter === status ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => {
                      console.log('상태 버튼 클릭:', status);
                      handleStatusSelect(status);
                    }}
                  >
                    {getStatusFilterText(status)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}