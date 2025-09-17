'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationSettings, useFavoriteGames } from '@/hooks';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import GameSearchModal from '@/components/notifications/GameSearchModal';

interface GameFilter {
  mode: 'all' | 'favorites' | 'selected';
  selectedGames: Array<{
    id: string;
    name: string;
    iconUrl?: string;
  }>;
}

export default function NewGamePostNotificationSettings() {
  const router = useRouter();
  const { settings, updateNewGamePost, isLoading } = useNotificationSettings();
  const { favoriteGames } = useFavoriteGames();
  
  const [gameFilter, setGameFilter] = useState<GameFilter>({
    mode: 'all',
    selectedGames: []
  });
  
  const [showGameSearch, setShowGameSearch] = useState(false);

  // 초기 설정 로드
  useEffect(() => {
    if (settings.newGamePost.settings) {
      const savedFilter = settings.newGamePost.settings.gameFilters;
      if (savedFilter) {
        setGameFilter({
          mode: savedFilter.mode || 'all',
          selectedGames: savedFilter.selectedGames || []
        });
      }
    }
  }, [settings]);

  // 설정 저장
  const saveSettings = async () => {
    const newSettings = {
      gameFilters: gameFilter
    };
    
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
    const favoriteGameList = favoriteGames.map(fav => ({
      id: fav.game.id,
      name: fav.game.name,
      iconUrl: fav.game.iconUrl
    }));
    
    setGameFilter(prev => ({
      ...prev,
      mode: 'favorites',
      selectedGames: favoriteGameList
    }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 헤더 */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">신규 게임메이트 글 알림</h1>
              <p className="text-gray-600 mt-1">받고 싶은 게임의 모집글 알림을 설정하세요</p>
            </div>
          </div>
        </div>

        {/* 설정 내용 */}
        <div className="p-6 space-y-6">
          
          {/* 필터 모드 선택 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">알림 받을 게임 선택</h3>
            
            <div className="space-y-3">
              {/* 모든 게임 */}
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="gameFilter"
                  value="all"
                  checked={gameFilter.mode === 'all'}
                  onChange={(e) => setGameFilter(prev => ({ ...prev, mode: 'all' }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">모든 게임 모집글 알림</div>
                  <div className="text-sm text-gray-500">모든 게임의 새로운 모집글 알림을 받습니다</div>
                </div>
              </label>

              {/* 관심 게임만 */}
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="gameFilter"
                  value="favorites"
                  checked={gameFilter.mode === 'favorites'}
                  onChange={(e) => {
                    setGameFilter(prev => ({ ...prev, mode: 'favorites' }));
                    setFavoriteGames();
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">관심 게임 모집글 알림</div>
                  <div className="text-sm text-gray-500">
                    좋아하는 게임({favoriteGames.length}개)의 모집글 알림만 받습니다
                  </div>
                </div>
              </label>

              {/* 선택한 게임만 */}
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="gameFilter"
                  value="selected"
                  checked={gameFilter.mode === 'selected'}
                  onChange={(e) => setGameFilter(prev => ({ ...prev, mode: 'selected' }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">선택한 게임 모집글 알림</div>
                  <div className="text-sm text-gray-500">
                    직접 선택한 게임({gameFilter.selectedGames.length}개)의 모집글 알림만 받습니다
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 선택한 게임 목록 (selected 모드일 때만) */}
          {gameFilter.mode === 'selected' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">선택된 게임</h4>
                <button
                  onClick={() => setShowGameSearch(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  게임 추가
                </button>
              </div>

              {gameFilter.selectedGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
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
                <div className="space-y-2">
                  {gameFilter.selectedGames.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {game.iconUrl && (
                          <img
                            src={game.iconUrl}
                            alt={game.name}
                            className="w-8 h-8 rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{game.name} 모집글 알림</div>
                          <div className="text-sm text-gray-500">이 게임의 새로운 모집글 알림을 받습니다</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeGame(game.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <h4 className="text-md font-medium text-gray-900 mb-4">관심 게임 목록</h4>
              {favoriteGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>아직 좋아하는 게임이 없습니다</p>
                  <button
                    onClick={() => router.push('/profile/favorite-games')}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    좋아하는 게임 설정하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {favoriteGames.map((fav) => (
                    <div
                      key={fav.id}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                    >
                      {fav.game.iconUrl && (
                        <img
                          src={fav.game.iconUrl}
                          alt={fav.game.name}
                          className="w-8 h-8 rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{fav.game.name} 모집글 알림</div>
                        <div className="text-sm text-gray-500">좋아하는 게임의 모집글 알림을 받습니다</div>
                      </div>
                      <span className="ml-auto text-blue-600 text-sm font-medium">⭐ 관심 게임</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
        </div>
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
