'use client';

import * as React from 'react';
import Image from 'next/image';
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
            "w-full justify-between bg-popover text-popover-foreground border-border hover:bg-popover/80 h-12",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value === 'all' ? (
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6" />
              <span>전체</span>
            </div>
          ) : selectedGame ? (
            <div className="flex items-center gap-2">
              {selectedGame.iconUrl && (
                <Image
                  src={selectedGame.iconUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-sm"
                />
              )}
              <span className="truncate">{selectedGame.name}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronDownIcon className="ml-2 h-6 w-6 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
             <PopoverContent className="w-[calc(var(--radix-popover-trigger-width)*2+0.75rem)] p-2 bg-popover text-popover-foreground border-border" align="start">
                 <Command className="bg-popover text-popover-foreground">
           <CommandInput
             placeholder="게임 이름이나 별칭으로 검색..."
             className="h-12 text-base px-4 py-4"
           />
          <CommandList>
            <CommandEmpty className="py-4 text-base">
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
                  className="py-3 px-3 text-base"
                >
                  <div className="flex items-center gap-3 w-full">
                    <LayoutGrid className="h-6 w-6 flex-shrink-0" />
                    <span className="truncate">전체</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-6 w-6",
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
                   className="py-3 px-3 text-base"
                 >
                  <div className="flex items-center gap-3 w-full">
                    {game.iconUrl && (
                      <Image
                        src={game.iconUrl}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-sm flex-shrink-0"
                      />
                    )}
                    <span className="truncate">{game.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-6 w-6",
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