// TODO: 이 파일은 새로운 shadcn/ui 기반 GameSearchSelect로 대체되었습니다. 
// 새로운 컴포넌트: web/components/ui/game-search-select.tsx
// 이 파일은 참고용으로 남겨두었으며, 모든 기능이 새 컴포넌트로 이전되면 삭제해야 합니다.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Game } from '@/types/models';

interface GameSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  initialGameName?: string;
}

export function GameSearchSelect({ value, onChange, className = '', initialGameName = '' }: GameSearchSelectProps) {
  const [query, setQuery] = useState(initialGameName);
  const [games, setGames] = useState<Game[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 검색어가 변경될 때마다 게임 목록 업데이트
  const fetchGames = useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    
    try {
      const url = trimmedQuery ? `/api/games?search=${encodeURIComponent(trimmedQuery)}` : '/api/games';
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        const gamesArray = Array.isArray(data) ? data : data.games || [];
        setGames(gamesArray);
      } else {
        console.error('API 요청 실패:', await res.text());
        setGames([]);
      }
    } catch (error) {
      console.error('게임 검색 중 오류 발생:', error);
      setGames([]);
    }
  }, []);

  // 디바운싱을 통한 검색 최적화
  useEffect(() => {
    const timer = setTimeout(() => {
      // 드롭다운이 열려있을 때만 검색 실행
      if (isOpen) {
        fetchGames(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchGames, isOpen]);

  // 부모 컴포넌트에서 value prop이 변경될 때 query를 동기화합니다.
  useEffect(() => {
    if (value) {
      // 이미 올바른 이름이 query에 있으면 추가 API 호출 방지
      const selectedGame = games.find(g => g.id === value);
      if (selectedGame && selectedGame.name === query) {
        return;
      }
      
      const fetchGameName = async () => {
        try {
          const res = await fetch(`/api/games/${value}`);
          if (res.ok) {
            const game = await res.json();
            setQuery(game.name);
          }
        } catch (error) {
          console.error('선택된 게임 정보 로드 중 오류 발생:', error);
        }
      };
      fetchGameName();
    } else {
      // value가 없으면(선택 해제) query도 비웁니다.
      setQuery('');
    }
  }, [value, games, query]);

  // 게임 선택 핸들러
  const handleSelect = (game: Game | null) => {
    if (game) {
      setQuery(game.name);
      onChange(game.id);
    } else {
      setQuery('');
      onChange('');
    }
    setIsOpen(false);
  };

  // 입력 필드 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // 드롭다운 열기
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // 입력 필드 포커스 핸들러
  const handleFocus = () => {
    setIsOpen(true);
    // 검색어가 없을 때 포커스하면 전체 목록을 불러옴
    if (!query) {
      fetchGames('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-md border border-cyber-black-300 bg-cyber-black-100 py-2 pl-3 pr-10 shadow-sm focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue sm:text-sm text-cyber-gray placeholder-cyber-gray/40"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="게임 검색..."
          autoComplete="off"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-2"
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
        >
          <svg
            className={`h-5 w-5 text-cyber-gray/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-cyber-black-200 border border-cyber-black-300 shadow-lg">
          <ul className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm">
            <li
              className="relative cursor-default select-none py-2 pl-3 pr-9 text-cyber-gray hover:bg-cyber-blue hover:text-white"
              onClick={() => handleSelect(null)}
            >
              <span className="ml-3 truncate font-semibold">
                -- 선택 없음 --
              </span>
            </li>
            {games.length > 0 ? (
              games.map((game) => (
                <li
                  key={game.id}
                  className="relative cursor-default select-none py-2 pl-3 pr-9 text-cyber-gray hover:bg-cyber-blue hover:text-white"
                  onClick={() => handleSelect(game)}
                >
                  <div className="flex items-center">
                    {game.iconUrl && (
                      <img
                        src={game.iconUrl}
                        alt=""
                        className="h-6 w-6 flex-shrink-0 rounded-full"
                      />
                    )}
                    <span className="ml-3 truncate">
                      {game.name}
                    </span>
                    {value === game.id && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
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
            ) : (
              query && (
                              <div className="relative cursor-default select-none py-2 px-4 text-cyber-gray/60">
                검색 결과가 없습니다.
              </div>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
