'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Game } from '@/types/models';
import Image from 'next/image';

interface MobileGameSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  showAllOption?: boolean;
}

export function MobileGameSearchSelect({ 
  value, 
  onChange, 
  className,
  placeholder = "게임 선택",
  showAllOption = false
}: MobileGameSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // 게임 검색 함수
  const fetchGames = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/games');
      
      if (res.ok) {
        const data = await res.json();
        const gamesArray = Array.isArray(data) ? data : data.games || [];
        setGames(gamesArray);
      }
    } catch (error) {
      console.error('게임 목록을 불러오는데 실패했습니다:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // 모바일 키보드 감지
  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      // 뷰포트 높이 변화로 키보드 감지 (모바일에서)
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const screenHeight = window.screen.height;
      
      // 키보드가 올라왔는지 확인 (높이가 20% 이상 줄어들면 키보드로 간주)
      const keyboardUp = (screenHeight - viewportHeight) / screenHeight > 0.2;
      setKeyboardVisible(keyboardUp);
    };

    // 초기 체크
    handleResize();
    
    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [open]);

  // 검색어로 게임 필터링
  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (game.aliases && game.aliases.some(alias => 
      alias.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  // 선택된 게임 정보 가져오기
  const getSelectedGame = () => {
    if (value === 'all') return { name: '전체 게임', iconUrl: null };
    const game = games.find(g => g.id === value);
    return game ? { name: game.name, iconUrl: game.iconUrl } : { name: placeholder, iconUrl: null };
  };

  // 닫기 핸들러
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      setSearchTerm('');
    }, 300);
  };

  // 게임 선택 핸들러
  const handleSelect = (gameId: string) => {
    onChange(gameId);
    handleClose();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 메인 버튼 - 모바일 친화적 스타일 */}
      <button
        type="button"
        className="flex items-center justify-between w-full py-3 px-0 text-base font-medium text-foreground border-b border-border bg-transparent focus:outline-none focus:border-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {getSelectedGame().iconUrl && (
            <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
              <Image
                src={getSelectedGame().iconUrl!}
                alt={getSelectedGame().name}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <span className="truncate">{getSelectedGame().name}</span>
        </div>
        <ChevronDown 
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            open ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end animate-in fade-in-0 duration-300"
          onClick={handleClose}
        >
          <div 
            className={`w-full bg-background rounded-t-xl flex flex-col transition-all duration-300 ease-out ${
              keyboardVisible ? 'max-h-[60vh] mobile-bottom-sheet keyboard-visible' : 'max-h-[80vh] mobile-bottom-sheet'
            } ${
              isClosing ? 'animate-out slide-out-to-bottom-full' : 'animate-in slide-in-from-bottom-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <button
              type="button"
              onClick={handleClose}
              className="w-full border-b border-border px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <h3 className="text-lg font-semibold">게임 선택</h3>
              <ChevronDown className="h-5 w-5 rotate-180 text-muted-foreground" />
            </button>

            {/* 검색 입력 */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <input
                  type="text"
                  placeholder="게임 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-accent/10 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            {/* 게임 목록 */}
            <div className="flex-1 overflow-y-auto">
            {showAllOption && (
              <button
                type="button"
                className={`w-full px-4 py-4 text-left border-b border-border transition-colors ${
                  value === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                }`}
                onClick={() => handleSelect('all')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">전체 게임</span>
                  {value === 'all' && <Check className="h-5 w-5 text-primary" />}
                </div>
              </button>
            )}

            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                로딩 중...
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className={`w-full px-4 py-4 text-left border-b border-border transition-colors ${
                    value === game.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => handleSelect(game.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {game.iconUrl && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={game.iconUrl}
                            alt={game.name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <span className="font-medium">{game.name}</span>
                    </div>
                    {value === game.id && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </button>
              ))
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
