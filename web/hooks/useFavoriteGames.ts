import { useState, useEffect } from 'react';

interface Game {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  aliases: string[];
}

interface FavoriteGame {
  id: string;
  gameId: string;
  addedAt: string;
  order?: number;
  game: Game;
}

export function useFavoriteGames() {
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 좋아하는 게임 목록 조회
  const fetchFavoriteGames = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/profile/favorite-games');
      const data = await response.json();
      
      if (data.success) {
        setFavoriteGames(data.favoriteGames);
      } else {
        setError(data.error || '좋아하는 게임을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 좋아하는 게임 추가
  const addFavoriteGame = async (gameId: string, order?: number) => {
    try {
      const response = await fetch('/api/profile/favorite-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId, order }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFavoriteGames(prev => [...prev, data.favoriteGame]);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 좋아하는 게임 삭제
  const removeFavoriteGame = async (favoriteGameId: string) => {
    try {
      const response = await fetch(`/api/profile/favorite-games/${favoriteGameId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFavoriteGames(prev => prev.filter(fav => fav.id !== favoriteGameId));
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 좋아하는 게임 순서 업데이트
  const updateFavoriteGamesOrder = async (reorderedGames: FavoriteGame[]) => {
    try {
      const response = await fetch('/api/profile/favorite-games', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favoriteGames: reorderedGames }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFavoriteGames(reorderedGames);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: '네트워크 오류가 발생했습니다.' };
    }
  };

  // 게임이 이미 좋아하는 게임인지 확인
  const isFavoriteGame = (gameId: string) => {
    return favoriteGames.some(fav => fav.gameId === gameId);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchFavoriteGames();
  }, []);

  return {
    favoriteGames,
    isLoading,
    error,
    addFavoriteGame,
    removeFavoriteGame,
    updateFavoriteGamesOrder,
    isFavoriteGame,
    refetch: fetchFavoriteGames,
  };
}
