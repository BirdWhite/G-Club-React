'use client';

import * as React from 'react';
import { Check, ChevronDownIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState, useEffect } from 'react';
import type { Game } from '@/types/models';

interface GameSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  showAllOption?: boolean;
}

export function GameSearchSelect({ 
  value, 
  onChange, 
  className,
  placeholder = "게임을 검색하세요...",
  showAllOption = false
}: GameSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 게임 검색 함수
  const fetchGames = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/games');
      
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
    } finally {
      setIsLoading(false);
    }
  };

  // 드롭다운이 열릴 때 게임 목록 로드
  useEffect(() => {
    if (open) {
      fetchGames();
    }
  }, [open]);

  // 선택된 게임 정보 가져오기
  const selectedGame = games.find(game => game.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          data-state={open ? "open" : "closed"}
          className={cn(
            "w-full justify-between bg-popover text-popover-foreground border-border hover:bg-popover/80",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value === 'all' ? (
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span>전체</span>
            </div>
          ) : selectedGame ? (
            <div className="flex items-center gap-2">
              {selectedGame.iconUrl && (
                <img
                  src={selectedGame.iconUrl}
                  alt=""
                  className="h-4 w-4 rounded-sm"
                />
              )}
              <span className="truncate">{selectedGame.name}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
             <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover text-popover-foreground border-border" align="start">
                 <Command className="bg-popover text-popover-foreground">
           <CommandInput
             placeholder="게임 이름이나 별칭으로 검색..."
           />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "검색 중..." : "게임을 찾을 수 없습니다."}
            </CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  value="all"
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <LayoutGrid className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">전체</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === 'all' ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              )}
                             {games.map((game) => (
                 <CommandItem
                   key={game.id}
                   value={`${game.name} ${game.aliases?.join(' ') || ''}`}
                   onSelect={() => {
                     onChange(game.id);
                     setOpen(false);
                   }}
                 >
                  <div className="flex items-center gap-2 w-full">
                    {game.iconUrl && (
                      <img
                        src={game.iconUrl}
                        alt=""
                        className="h-4 w-4 rounded-sm flex-shrink-0"
                      />
                    )}
                    <span className="truncate">{game.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === game.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 