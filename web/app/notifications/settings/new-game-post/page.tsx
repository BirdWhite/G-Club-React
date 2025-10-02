'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useFavoriteGames } from '@/hooks/useFavoriteGames';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { GameSearchModal } from '@/components/notifications/GameSearchModal';

interface GameFilter {
  mode: 'all' | 'favorites' | 'custom';
  selectedGames: Array<{
    id: string;
    name: string;
    iconUrl?: string;
  }>;
}

interface NewGamePostSettings {
  gameFilters?: GameFilter;
}

export default function NewGamePostNotificationSettings() {
  const router = useRouter();
  const { settings, updateNewGamePost, updateCustomGameIds, isLoading } = useNotificationSettings();
  const { favoriteGames } = useFavoriteGames();
  
  const [gameFilter, setGameFilter] = useState<GameFilter>({
    mode: 'favorites',
    selectedGames: []
  });
  
  const [showGameSearch, setShowGameSearch] = useState(false);

  // 게임 정보를 가져오는 함수
  const loadGameInfo = async (gameIds: string[]) => {
    if (gameIds.length === 0) return [];
    
    try {
      const response = await fetch(`/api/games?ids=${gameIds.join(',')}`);
      if (response.ok) {
        const games = await response.json();
        return games.map((game: { id: string; name: string; iconUrl?: string }) => ({
          id: game.id,
          name: game.name,
          iconUrl: game.iconUrl
        }));
      }
    } catch (error) {
      console.error('게임 정보 로드 실패:', error);
    }
    
    // 실패 시 ID만으로 반환
    return gameIds.map(id => ({
      id,
      name: `게임 ID: ${id}`,
      iconUrl: undefined
    }));
  };

  // 초기 설정 로드
  useEffect(() => {
    if (settings.newGamePost.settings) {
      const savedSettings = settings.newGamePost.settings as NewGamePostSettings | undefined;
      const savedFilter = savedSettings?.gameFilters;
      
      if (savedFilter) {
        const mode = savedFilter.mode || 'all';
        
        if (mode === 'custom' && settings.customGameIds && settings.customGameIds.length > 0) {
          // 커스텀 모드인 경우 customGameIds에서 게임 정보 로드
          // 관심 게임처럼 필요할 때마다 최신 정보를 가져옴
          loadGameInfo(settings.customGameIds).then(customGames => {
            setGameFilter({
              mode: 'custom',
              selectedGames: customGames
            });
          });
        } else {
          // 다른 모드인 경우에도 selectedGames는 유지
          setGameFilter({
            mode,
            selectedGames: savedFilter.selectedGames || []
          });
        }
      }
    }
  }, [settings]);

  // 설정 저장
  const saveSettings = async () => {
    const newSettings = {
      gameFilters: gameFilter
    };
    
    // 커스텀 모드인 경우 커스텀 게임 배열도 저장
    if (gameFilter.mode === 'custom') {
      const customGameIds = gameFilter.selectedGames.map(game => game.id);
      await updateCustomGameIds(customGameIds);
    }
    
    await updateNewGamePost(settings.newGamePost.enabled, newSettings);
    router.back();
  };

  // 게임 추가
  const addGame = (game: { id: string; name: string; iconUrl?: string }) => {
    if (!gameFilter.selectedGames.find(g => g.id === game.id)) {
      setGameFilter(prev => ({
        ...prev,
        selectedGames: [...prev.selectedGames, game]
      }));
    }
    setShowGameSearch(false);
  };

  // 게임 제거
  const removeGame = (gameId: string) => {
    setGameFilter(prev => ({
      ...prev,
      selectedGames: prev.selectedGames.filter(g => g.id !== gameId)
    }));
  };

  // 좋아하는 게임으로 설정
  const setFavoriteGames = () => {
    setGameFilter(prev => ({
      ...prev,
      mode: 'favorites'
      // selectedGames는 그대로 유지 (커스텀 선택 게임 보존)
    }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-12">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">신규 게임메이트 글 알림</h1>
            <p className="text-muted-foreground mt-1">받고 싶은 게임의 모집글 알림을 설정하세요</p>
          </div>
        </div>
      </div>

      {/* 설정 내용 */}
      <div className="space-y-6">
          
          {/* 필터 모드 선택 */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">알림 받을 게임 선택</h3>
            
            <div className="space-y-3">
              {/* 모든 게임 */}
              <label className={`flex items-center p-4 border border-border rounded-lg cursor-pointer transition-colors ${
                gameFilter.mode === 'all' 
                  ? 'bg-card-elevated hover:bg-card-elevated/80' 
                  : 'bg-card hover:bg-card/80'
              }`}>
                <input
                  type="radio"
                  name="gameFilter"
                  value="all"
                  checked={gameFilter.mode === 'all'}
                  onChange={() => setGameFilter(prev => ({ ...prev, mode: 'all' }))}
                  className="w-4 h-4 text-primary border-border focus:ring-primary"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-foreground">모든 게임 모집글 알림</div>
                  <div className="text-sm text-muted-foreground">모든 게임의 새로운 모집글 알림을 받습니다</div>
                </div>
              </label>

              {/* 관심 게임만 */}
              <label className={`flex items-center p-4 border border-border rounded-lg cursor-pointer transition-colors ${
                gameFilter.mode === 'favorites' 
                  ? 'bg-card-elevated hover:bg-card-elevated/80' 
                  : 'bg-card hover:bg-card/80'
              }`}>
                <input
                  type="radio"
                  name="gameFilter"
                  value="favorites"
                  checked={gameFilter.mode === 'favorites'}
                  onChange={() => {
                    setGameFilter(prev => ({ ...prev, mode: 'favorites' }));
                    setFavoriteGames();
                  }}
                  className="w-4 h-4 text-primary border-border focus:ring-primary"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-foreground">관심 게임 모집글 알림</div>
                  <div className="text-sm text-muted-foreground">
                    좋아하는 게임({favoriteGames.length}개)의 모집글 알림만 받습니다
                  </div>
                </div>
              </label>

              {/* 선택한 게임만 */}
              <label className={`flex items-center p-4 border border-border rounded-lg cursor-pointer transition-colors ${
                gameFilter.mode === 'custom' 
                  ? 'bg-card-elevated hover:bg-card-elevated/80' 
                  : 'bg-card hover:bg-card/80'
              }`}>
                <input
                  type="radio"
                  name="gameFilter"
                  value="custom"
                  checked={gameFilter.mode === 'custom'}
                  onChange={() => setGameFilter(prev => ({ ...prev, mode: 'custom' }))}
                  className="w-4 h-4 text-primary border-border focus:ring-primary"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-foreground">선택한 게임 모집글 알림</div>
                  <div className="text-sm text-muted-foreground">
                    직접 선택한 게임({gameFilter.selectedGames.length}개)의 모집글 알림만 받습니다
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 선택한 게임 목록 (custom 모드일 때만) */}
          {gameFilter.mode === 'custom' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-foreground">선택된 게임</h4>
                <button
                  onClick={() => setShowGameSearch(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  게임 추가
                </button>
              </div>

              {gameFilter.selectedGames.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p>게임을 추가해주세요</p>
                  <button
                    onClick={() => setShowGameSearch(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    게임 검색하기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gameFilter.selectedGames.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg relative group"
                    >
                      {game.iconUrl ? (
                        <img
                          src={game.iconUrl}
                          alt={game.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate flex items-center gap-1">
                          {game.name}
                          {favoriteGames.some(fav => fav.game.id === game.id) && (
                            <span className="text-primary">⭐</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeGame(game.id)}
                        className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 좋아하는 게임 목록 (favorites 모드일 때만) */}
          {gameFilter.mode === 'favorites' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-foreground">관심 게임 목록</h4>
                <button
                  onClick={() => router.push('/profile/favorite-games')}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  관심 게임 설정
                </button>
              </div>
              {favoriteGames.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>아직 관심 게임이 없습니다</p>
                  <button
                    onClick={() => router.push('/profile/favorite-games')}
                    className="mt-2 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    관심 게임 설정하기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favoriteGames.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg"
                    >
                      {fav.game.iconUrl ? (
                        <img
                          src={fav.game.iconUrl}
                          alt={fav.game.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate flex items-center gap-1">
                          {fav.game.name}
                          <span className="text-primary">⭐</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 하단 버튼 */}
        <div className="mt-12 flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            저장
          </button>
        </div>

      {/* 게임 검색 모달 */}
      <GameSearchModal
        isOpen={showGameSearch}
        onClose={() => setShowGameSearch(false)}
        onGameSelect={addGame}
        excludeGameIds={gameFilter.selectedGames.map(g => g.id)}
      />
    </div>
  );
}
