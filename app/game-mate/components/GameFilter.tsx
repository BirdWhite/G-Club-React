'use client';

import { useState, useEffect, useRef } from 'react';

type Game = {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
};

type StatusFilterType = 'all' | 'recruiting' | 'open' | 'full' | 'completed';

interface GameFilterProps {
  games: Game[];
  selectedGame: string;
  statusFilter: StatusFilterType;
  searchTerm: string;
  onGameChange: (gameId: string) => void;
  onStatusChange: (status: StatusFilterType) => void;
  onSearch: (term: string) => void;
}

export default function GameFilter({
  games,
  selectedGame,
  statusFilter,
  searchTerm,
  onGameChange,
  onStatusChange,
  onSearch,
}: GameFilterProps) {
  // 각 드롭다운에 개별 ref 사용
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const statusContainerRef = useRef<HTMLDivElement>(null);
  const [isGameDropdownOpen, setIsGameDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [filteredGames, setFilteredGames] = useState<Game[]>(games);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // 외부 클릭 감지 및 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 게임 드롭다운 외부 클릭 감지
      if (gameContainerRef.current && !gameContainerRef.current.contains(event.target as Node)) {
        setIsGameDropdownOpen(false);
      }
      
      // 상태 필터 드롭다운 외부 클릭 감지
      if (statusContainerRef.current && !statusContainerRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 게임 검색 필터링
  useEffect(() => {
    if (localSearchTerm.trim() === '') {
      setFilteredGames(games);
    } else {
      const filtered = games.filter(game =>
        game.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        (game.description?.toLowerCase().includes(localSearchTerm.toLowerCase()) ?? false)
      );
      setFilteredGames(filtered);
    }
  }, [localSearchTerm, games]);

  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearch(value);
  };

  // 게임 선택 핸들러
  const handleGameSelect = (gameId: string) => {
    onGameChange(gameId);
    setIsGameDropdownOpen(false);
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

  // 선택된 게임 이름 가져오기
  const getSelectedGameName = () => {
    if (selectedGame === 'all') return '전체 게임';
    const game = games.find(g => g.id === selectedGame);
    return game ? game.name : '게임 선택';
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* 게임 선택 드롭다운 */}
        <div className="relative flex-1" ref={gameContainerRef}>
          <div className="relative w-full">
            <button
              type="button"
              className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              id="game-menu"
              aria-expanded={isGameDropdownOpen}
              aria-haspopup="true"
              onClick={() => {
                setIsGameDropdownOpen(!isGameDropdownOpen);
                if (!isGameDropdownOpen) setIsStatusDropdownOpen(false);
              }}
            >
              {getSelectedGameName()}
              <svg
                className={`-mr-1 ml-2 h-5 w-5 transition-transform ${isGameDropdownOpen ? 'rotate-180' : ''}`}
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

            {isGameDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                {/* 게임 검색 입력창 */}
                <div className="px-3 py-2 border-b border-gray-200">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="게임 검색..."
                      value={localSearchTerm}
                      onChange={handleSearchChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <ul className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm">
                  <li
                    className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${selectedGame === 'all' ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900 hover:bg-indigo-50'}`}
                    onClick={() => handleGameSelect('all')}
                  >
                    <div className="flex items-center">
                      <span className="ml-3 block truncate font-medium">전체 게임</span>
                      {selectedGame === 'all' && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  </li>
                  {filteredGames.map((game) => (
                    <li
                      key={game.id}
                      className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${selectedGame === game.id ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900 hover:bg-indigo-50'}`}
                      onClick={() => handleGameSelect(game.id)}
                    >
                      <div className="flex items-center">
                        {game.iconUrl && (
                          <img
                            src={game.iconUrl}
                            alt=""
                            className="h-6 w-6 flex-shrink-0 rounded-full mr-3"
                          />
                        )}
                        <span className="block truncate font-medium">{game.name}</span>
                        {selectedGame === game.id && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                            <svg
                              className="h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                  {filteredGames.length === 0 && localSearchTerm && (
                    <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-500">
                      검색 결과가 없습니다.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 상태 필터 드롭다운 */}
        <div className="relative w-full md:w-56" ref={statusContainerRef}>
          <button
            type="button"
            className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => {
              console.log('상태 필터 버튼 클릭');
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsGameDropdownOpen(false); // 게임 드롭다운은 무조건 닫기
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