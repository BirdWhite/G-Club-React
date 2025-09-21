'use client';

import { useState, useEffect } from 'react';
import type { Game } from '@/types/models';

interface GameSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameSelect: (game: { id: string; name: string; iconUrl?: string }) => void;
  excludeGameIds?: string[];
}

export function GameSearchModal({ 
  isOpen, 
  onClose, 
  onGameSelect, 
  excludeGameIds = [] 
}: GameSearchModalProps) {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 게임 검색
  const searchGames = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setGames([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        const allGames = Array.isArray(data) ? data : data.games || [];
        
        // 검색어로 필터링하고 제외할 게임들 제거
        const filteredGames = allGames
          .filter((game: Game) => 
            game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            game.aliases?.some((alias: string) => 
              alias.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
          .filter((game: Game) => !excludeGameIds.includes(game.id))
          .slice(0, 10); // 최대 10개만
        
        setGames(filteredGames);
      }
    } catch (error) {
      console.error('게임 검색 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색어 변경 시 검색 실행
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGames(query);
    }, 300); // 300ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [query, excludeGameIds]);

  // 게임 선택 핸들러
  const handleGameSelect = (game: Game) => {
    onGameSelect({
      id: game.id,
      name: game.name,
      iconUrl: game.iconUrl || undefined
    });
    setQuery('');
    setGames([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden border border-border">
        {/* 헤더 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">게임 검색</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 검색 입력 */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="게임 이름을 입력하세요..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
              autoFocus
            />
          </div>
        </div>
        
        {/* 검색 결과 */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-muted-foreground">검색 중...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {query ? '검색 결과가 없습니다' : '게임 이름을 입력해주세요'}
            </div>
          ) : (
            <div className="p-2">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleGameSelect(game)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors text-left"
                >
                  {game.iconUrl && (
                    <img
                      src={game.iconUrl}
                      alt={game.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-card-foreground">{game.name}</div>
                    {game.description && (
                      <div className="text-sm text-muted-foreground">{game.description}</div>
                    )}
                    {game.aliases && game.aliases.length > 0 && (
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        별명: {game.aliases.join(', ')}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
