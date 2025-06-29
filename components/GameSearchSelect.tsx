'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Game {
  id: string;
  name: string;
  iconUrl?: string;
}

interface GameSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function GameSearchSelect({ value, onChange, className = '' }: GameSearchSelectProps) {
  const [query, setQuery] = useState('');
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
    if (!searchQuery.trim()) {
      setGames([]);
      return;
    }

    try {
      const res = await fetch(`/api/games?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      }
    } catch (error) {
      console.error('게임 검색 중 오류 발생:', error);
    }
  }, []);

  // 디바운싱을 통한 검색 최적화
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGames(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchGames]);

  // 초기 선택된 게임 로드
  useEffect(() => {
    if (value && query === '') {
      // 초기 값이 있으면 해당 게임 정보를 불러와서 표시
      const fetchInitialGame = async () => {
        try {
          const res = await fetch(`/api/games/${value}`);
          if (res.ok) {
            const game = await res.json();
            setQuery(game.name);
          }
        } catch (error) {
          console.error('게임 정보 로드 중 오류 발생:', error);
        }
      };

      fetchInitialGame();
    }
  }, [value]);

  // 게임 선택 핸들러
  const handleSelect = (game: Game) => {
    setQuery(game.name);
    onChange(game.id);
    setIsOpen(false);
  };

  // 입력 필드 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // 입력 필드가 비어있으면 선택 해제
    if (!newValue.trim()) {
      onChange('');
    }
    
    // 드롭다운 열기
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // 입력 필드 포커스 핸들러
  const handleFocus = () => {
    if (query) {
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
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
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

      {isOpen && query && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
          {games.length > 0 ? (
            <ul className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm">
              {games.map((game) => (
                <li
                  key={game.id}
                  className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white"
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
              ))}
            </ul>
          ) : (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
