// TODO: 이 파일은 새로운 shadcn/ui 기반 GameSearchSelect로 대체되었습니다. 
// 새로운 컴포넌트: web/components/ui/game-search-select.tsx
// 이 파일은 참고용으로 남겨두었으며, 모든 기능이 새 컴포넌트로 이전되면 삭제해야 합니다.

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Game } from '@/types/models';

interface GameSearchSelectProps {
  value: string;
  onChange: (gameId: string) => void;
  onSearch?: (term: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export function GameFilterDropdown({
  value,
  onChange,
  placeholder = '게임 검색',
  showAllOption = false,
  className = '',
}: GameSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 게임 목록 불러오기
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games?limit=100');
        if (res.ok) {
          const data = await res.json();
          setGames(data);
          setFilteredGames(data);
        }
      } catch (error) {
        console.error('게임 목록을 불러오는 중 오류 발생:', error);
      }
    };

    fetchGames();
  }, []);

  // 게임 검색 필터링
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGames(games);
    } else {
      const filtered = games.filter(
        (game) =>
          game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (game.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
      setFilteredGames(filtered);
    }
  }, [searchTerm, games]);

  // 선택된 게임 이름 가져오기
  const getSelectedGameName = () => {
    if (value === 'all' && showAllOption) return '전체 게임';
    const game = games.find((g) => g.id === value);
    return game ? game.name : placeholder;
  };

  // 게임 선택 핸들러
  const handleSelect = (gameId: string) => {
    onChange(gameId);
    setIsOpen(false);
  };

  // 드롭다운 토글
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <button
          type="button"
          className="inline-flex justify-between w-full rounded-md border border-cyber-black-300 shadow-sm px-4 py-2.5 bg-cyber-black-100 text-sm font-medium text-cyber-gray hover:bg-cyber-black-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-blue transition-colors"
          onClick={toggleDropdown}
        >
          <span className="truncate">{getSelectedGameName()}</span>
          <svg
            className={`-mr-1 ml-2 h-5 w-5 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
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

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-cyber-black-200 shadow-lg ring-1 ring-black ring-opacity-5 border border-cyber-black-300">
            {/* 게임 검색 입력창 */}
            <div className="px-3 py-2 border-b border-cyber-black-300">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-cyber-gray/40"
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
                  ref={inputRef}
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-cyber-black-300 rounded-md text-sm leading-5 bg-cyber-black-100 placeholder-cyber-gray/50 text-cyber-gray focus:outline-none focus:ring-cyber-blue focus:border-cyber-blue"
                  placeholder="게임 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <ul className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm">
              {showAllOption && (
                <li
                  className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                    value === 'all' ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-cyber-gray hover:bg-cyber-black-300'
                  }`}
                  onClick={() => handleSelect('all')}
                >
                  <div className="flex items-center">
                    <span className="ml-3 block truncate font-medium">전체 게임</span>
                    {value === 'all' && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-cyber-blue">
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
              )}

              {filteredGames.length === 0 ? (
                <li className="px-4 py-2 text-sm text-cyber-gray/60">검색 결과가 없습니다.</li>
              ) : (
                filteredGames.map((game) => (
                  <li
                    key={game.id}
                    className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                      value === game.id ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-cyber-gray hover:bg-cyber-black-300'
                    }`}
                    onClick={() => handleSelect(game.id)}
                  >
                    <div className="flex items-center">
                      {game.iconUrl && (
                        <div className="flex-shrink-0 h-6 w-6 rounded-full overflow-hidden">
                          <Image
                            src={game.iconUrl}
                            alt={game.name}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <span className="ml-3 block truncate font-medium">{game.name}</span>
                      {value === game.id && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-cyber-blue">
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
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
