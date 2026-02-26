'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Check, ChevronDown, Search, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { useGameSearch } from '@/hooks/useGameSearch';
import type { Game } from '@/types/models';

interface GameSearchUIProps {
  value: string;
  onChange: (gameId: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showSearchIcon?: boolean;
  showGameIcon?: boolean;
  maxHeight?: string;
  searchPlaceholder?: string;
}

export function GameSearchUI({
  value,
  onChange,
  placeholder = '게임을 선택하세요',
  showAllOption = false,
  className = '',
  disabled = false,
  size = 'md',
  variant = 'default',
  showSearchIcon = true,
  showGameIcon = true,
  maxHeight = '240px',
  searchPlaceholder = '게임 이름으로 검색...',
}: GameSearchUIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const {
    games,
    filteredGames,
    selectedGame,
    isLoading,
    error,
    searchGames,
    selectGame,
    getSelectedGameName,
    getSelectedGameIcon,
  } = useGameSearch({ 
    initialValue: value, 
    showAllOption 
  });

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 검색어 변경 시 필터링
  useEffect(() => {
    searchGames(searchTerm);
  }, [searchTerm, searchGames]);

  // 선택된 게임 변경 시 부모 컴포넌트에 알림
  useEffect(() => {
    if (value !== selectedGame?.id) {
      const currentGame = games.find(game => game.id === value);
      if (currentGame) {
        selectGame(value);
      }
    }
  }, [value, games, selectGame, selectedGame]);

  // 드롭다운 열기/닫기
  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
    }
  };

  // 게임 선택 핸들러
  const handleGameSelect = (gameId: string) => {
    selectGame(gameId);
    onChange(gameId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 검색어 입력 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 검색어 입력 필드 클릭 시 이벤트 전파 방지
  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggleDropdown();
      }
      return;
    }

    const list = listRef.current;
    if (!list) return;

    const items = list.querySelectorAll('[role="option"]');
    const currentIndex = Array.from(items).findIndex(item => 
      item.getAttribute('aria-selected') === 'true'
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        (items[nextIndex] as HTMLElement)?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        (items[prevIndex] as HTMLElement)?.focus();
        break;
      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0) {
          (items[currentIndex] as HTMLElement)?.click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // 크기별 스타일
  const sizeStyles = {
    sm: 'h-8 text-sm',
    md: 'h-12 text-base', // 상태 필터와 동일한 높이
    lg: 'h-12 text-base', // 상태 필터와 동일한 높이
  };

  // 변형별 스타일 - 상태 필터와 동일한 스타일 사용
  const variantStyles = {
    default: 'bg-popover border-border text-popover-foreground hover:bg-popover/80',
    outline: 'bg-popover border-border text-popover-foreground hover:bg-popover/80',
    ghost: 'bg-transparent border-transparent text-foreground hover:bg-accent',
  };

  const displayName = getSelectedGameName() || placeholder;
  const displayIcon = getSelectedGameIcon();

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        className={cn(
          'w-full flex items-center justify-between rounded-md border px-3 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={placeholder}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showGameIcon && (
            <div className="flex-shrink-0">
              {value === 'all' && showAllOption ? (
                <Gamepad2 className="h-4 w-4" />
              ) : displayIcon ? (
                <Image
                  src={displayIcon}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-sm object-cover"
                />
              ) : (
                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {displayName}
          </span>
        </div>
        <ChevronDown 
          className={cn(
            'h-4 w-4 flex-shrink-0 opacity-50 transition-transform',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          {/* 검색 입력 */}
          {showSearchIcon && (
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  className={cn(
                    'w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onClick={handleSearchClick}
                />
              </div>
            </div>
          )}

          {/* 게임 목록 */}
          <div className="p-1">
            {error ? (
              <div className="px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <ul
                ref={listRef}
                className="max-h-60 overflow-auto"
                role="listbox"
                style={{ maxHeight }}
              >
                {/* 전체 옵션 */}
                {showAllOption && (
                  <li
                    role="option"
                    aria-selected={value === 'all'}
                    className={cn(
                      'flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer',
                      'hover:bg-accent focus:bg-accent focus:outline-none',
                      value === 'all' && 'bg-accent'
                    )}
                    onClick={() => handleGameSelect('all')}
                    tabIndex={-1}
                  >
                    <Gamepad2 className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">전체</span>
                    {value === 'all' && <Check className="h-4 w-4" />}
                  </li>
                )}

                {/* 게임 목록 */}
                {isLoading ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    검색 중...
                  </li>
                ) : filteredGames.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    {searchTerm ? '검색 결과가 없습니다.' : '게임이 없습니다.'}
                  </li>
                ) : (
                  filteredGames.map((game: Game) => (
                    <li
                      key={game.id}
                      role="option"
                      aria-selected={value === game.id}
                      className={cn(
                        'flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer',
                        'hover:bg-accent focus:bg-accent focus:outline-none',
                        value === game.id && 'bg-accent'
                      )}
                      onClick={() => handleGameSelect(game.id)}
                      tabIndex={-1}
                    >
                      {showGameIcon && (
                        <div className="flex-shrink-0">
                          {game.iconUrl ? (
                            <Image
                              src={game.iconUrl}
                              alt=""
                              width={16}
                              height={16}
                              className="h-4 w-4 rounded-sm object-cover"
                            />
                          ) : (
                            <div className="h-4 w-4 rounded-sm bg-muted" />
                          )}
                        </div>
                      )}
                      <span className="flex-1 truncate">{game.name}</span>
                      {value === game.id && <Check className="h-4 w-4" />}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
