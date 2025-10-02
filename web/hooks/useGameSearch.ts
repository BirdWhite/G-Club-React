'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Game } from '@/types/models';

interface UseGameSearchProps {
  initialValue?: string;
  showAllOption?: boolean;
}

interface UseGameSearchReturn {
  // 상태
  games: Game[];
  filteredGames: Game[];
  selectedGame: Game | null;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  searchGames: (query: string) => void;
  selectGame: (gameId: string) => void;
  clearSelection: () => void;
  refreshGames: () => void;
  
  // 유틸리티
  getSelectedGameName: () => string;
  getSelectedGameIcon: () => string | null;
}

export function useGameSearch({ 
  initialValue = '', 
  showAllOption = false 
}: UseGameSearchProps = {}): UseGameSearchReturn {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 게임 목록 불러오기
  const fetchGames = useCallback(async (searchQuery: string = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = searchQuery.trim() 
        ? `/api/games?search=${encodeURIComponent(searchQuery.trim())}` 
        : '/api/games';
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`API 요청 실패: ${res.status}`);
      }
      
      const data = await res.json();
      const gamesArray = Array.isArray(data) ? data : data.games || [];
      
      setGames(gamesArray);
      setFilteredGames(gamesArray);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '게임 목록을 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('게임 검색 중 오류 발생:', err);
      setGames([]);
      setFilteredGames([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 게임 검색 (필터링)
  const searchGames = useCallback((query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    
    if (!trimmedQuery) {
      setFilteredGames(games);
      return;
    }
    
    const filtered = games.filter(game => 
      game.name.toLowerCase().includes(trimmedQuery) ||
      (game.aliases && game.aliases.some(alias => 
        alias.toLowerCase().includes(trimmedQuery)
      )) ||
      (game.description && game.description.toLowerCase().includes(trimmedQuery))
    );
    
    setFilteredGames(filtered);
  }, [games]);

  // 게임 선택
  const selectGame = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
  }, []);

  // 선택 해제
  const clearSelection = useCallback(() => {
    setSelectedGameId('');
  }, []);

  // 게임 목록 새로고침
  const refreshGames = useCallback(() => {
    fetchGames();
  }, [fetchGames]);

  // 선택된 게임 정보 가져오기
  const selectedGame = games.find(game => game.id === selectedGameId) || null;

  // 선택된 게임 이름 가져오기
  const getSelectedGameName = useCallback(() => {
    if (selectedGameId === 'all' && showAllOption) {
      return '전체';
    }
    return selectedGame ? selectedGame.name : '';
  }, [selectedGameId, selectedGame, showAllOption]);

  // 선택된 게임 아이콘 가져오기
  const getSelectedGameIcon = useCallback(() => {
    return selectedGame?.iconUrl || null;
  }, [selectedGame]);

  // 초기 게임 목록 로드
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // 선택된 게임이 변경될 때 필터링된 목록 업데이트
  useEffect(() => {
    setFilteredGames(games);
  }, [games]);

  return {
    // 상태
    games,
    filteredGames,
    selectedGame,
    isLoading,
    error,
    
    // 액션
    searchGames,
    selectGame,
    clearSelection,
    refreshGames,
    
    // 유틸리티
    getSelectedGameName,
    getSelectedGameIcon,
  };
}
