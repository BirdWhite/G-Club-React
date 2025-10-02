'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFavoriteGames } from '@/hooks/useFavoriteGames';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { GameSearchModal } from '@/components/notifications/GameSearchModal';

export default function FavoriteGamesPage() {
  const router = useRouter();
  const { 
    favoriteGames, 
    isLoading, 
    error, 
    addFavoriteGame, 
    removeFavoriteGame, 
    updateFavoriteGamesOrder,
    refetch
  } = useFavoriteGames();
  
  const [showGameSearch, setShowGameSearch] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 게임 추가
  const handleAddGame = async (game: { id: string; name: string; iconUrl?: string }) => {
    const result = await addFavoriteGame(game.id);
    if (result.success) {
      setShowGameSearch(false);
    } else {
      alert(result.error || '게임 추가에 실패했습니다.');
    }
  };

  // 게임 제거
  const handleRemoveGame = async (gameId: string) => {
    if (confirm('이 게임을 관심 게임에서 제거하시겠습니까?')) {
      const result = await removeFavoriteGame(gameId);
      if (!result.success) {
        alert(result.error || '게임 제거에 실패했습니다.');
      }
    }
  };

  // 순서 변경 함수들
  const moveGameUp = async (index: number) => {
    if (index === 0) return; // 첫 번째 항목은 위로 이동할 수 없음
    
    setIsUpdating(true);
    try {
      const items = Array.from(favoriteGames);
      // 현재 항목과 위 항목의 위치를 바꿈
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      
      // 순서 업데이트
      const reorderedGames = items.map((item, idx) => ({
        ...item,
        order: idx + 1
      }));

      const result = await updateFavoriteGamesOrder(reorderedGames);
      if (!result.success) {
        console.error('순서 업데이트 실패:', result.error);
        await refetch();
      }
    } catch (error) {
      console.error('순서 업데이트 중 오류:', error);
      await refetch();
    } finally {
      setIsUpdating(false);
    }
  };

  const moveGameDown = async (index: number) => {
    if (index === favoriteGames.length - 1) return; // 마지막 항목은 아래로 이동할 수 없음
    
    setIsUpdating(true);
    try {
      const items = Array.from(favoriteGames);
      // 현재 항목과 아래 항목의 위치를 바꿈
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      
      // 순서 업데이트
      const reorderedGames = items.map((item, idx) => ({
        ...item,
        order: idx + 1
      }));

      const result = await updateFavoriteGamesOrder(reorderedGames);
      if (!result.success) {
        console.error('순서 업데이트 실패:', result.error);
        await refetch();
      }
    } catch (error) {
      console.error('순서 업데이트 중 오류:', error);
      await refetch();
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              <h1 className="text-2xl font-bold text-foreground">관심 게임 설정</h1>
              <p className="text-muted-foreground mt-1">좋아하는 게임을 추가하고 관리하세요</p>
            </div>
          </div>
          
          {/* 게임 추가 버튼 */}
          <button
            onClick={() => setShowGameSearch(true)}
            disabled={isUpdating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            게임 추가
          </button>
        </div>
      </div>

      {/* 설정 내용 */}
      <div className="space-y-6">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {/* 관심 게임 목록 */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              관심 게임 목록 ({favoriteGames.length}개)
              {isUpdating && <span className="text-sm text-primary ml-2">(업데이트 중...)</span>}
            </h3>
            
            {favoriteGames.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-lg font-medium mb-2 text-foreground">아직 관심 게임이 없습니다</p>
                <p className="text-sm mb-4">위의 &apos;게임 추가&apos; 버튼을 클릭하여 관심 게임을 추가해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favoriteGames.map((favoriteGame, index) => (
                  <div
                    key={favoriteGame.id}
                    className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* 순서 번호 */}
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>

                        {/* 게임 아이콘 */}
                        <div className="flex-shrink-0">
                          {favoriteGame.game.iconUrl ? (
                            <Image
                              src={favoriteGame.game.iconUrl}
                              alt={favoriteGame.game.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* 게임 정보 */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-foreground truncate">
                            {favoriteGame.game.name}
                          </h4>
                          {favoriteGame.game.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {favoriteGame.game.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            추가일: {new Date(favoriteGame.addedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* 순서 변경 버튼들 */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => moveGameUp(index)}
                            disabled={isUpdating || index === 0}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/30 disabled:cursor-not-allowed transition-colors"
                            title="위로 이동"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveGameDown(index)}
                            disabled={isUpdating || index === favoriteGames.length - 1}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/30 disabled:cursor-not-allowed transition-colors"
                            title="아래로 이동"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => handleRemoveGame(favoriteGame.gameId)}
                          disabled={isUpdating}
                          className="p-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="관심 게임에서 제거"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          {favoriteGames.length > 0 && (
            <div className="mt-12 space-y-4">
              {/* 순서 변경 안내 */}
              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">순서 변경</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      각 게임 항목의 오른쪽 위/아래 화살표 버튼을 클릭하여 순서를 변경할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
      </div>

      {/* 게임 검색 모달 */}
      <GameSearchModal
        isOpen={showGameSearch}
        onClose={() => setShowGameSearch(false)}
        onGameSelect={handleAddGame}
        excludeGameIds={favoriteGames.map(fav => fav.gameId)}
      />
    </div>
  );
}
