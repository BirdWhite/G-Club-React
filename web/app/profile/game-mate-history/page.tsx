'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Gamepad2, Users, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface GamePost {
  id: string;
  title: string;
  content: string;
  startTime: string;
  maxParticipants: number;
  status: string;
  isFull: boolean;
  createdAt: string;
  updatedAt: string;
  game?: {
    id: string;
    name: string;
    iconUrl?: string;
  };
  author: {
    id: string;
    userId: string;
    name: string;
    image?: string;
  };
  _count: {
    participants: number;
    waitingList: number;
  };
  isOwner: boolean;
  isParticipating: boolean;
  isWaiting: boolean;
  participantStatus?: 'ACTIVE' | 'LEFT_EARLY';
}

interface GameMateHistoryResponse {
  posts: GamePost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function GameMateHistoryPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useProfile();
  const [gamePosts, setGamePosts] = useState<GamePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // 게임메이트 내역 로드
  const loadGameMateHistory = useCallback(async (page: number = 1) => {
    if (!profile?.userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/profile/game-mate-history?page=${page}&limit=10`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('게임메이트 내역을 불러올 수 없습니다.');
      }
      
      const data: GameMateHistoryResponse = await response.json();
      setGamePosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      console.error('게임메이트 내역 로드 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.userId, router]);

  useEffect(() => {
    if (profileLoading) return;
    
    if (!profile) {
      router.push('/auth/login');
      return;
    }
    
    loadGameMateHistory();
  }, [profile, profileLoading, router, loadGameMateHistory]);

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadGameMateHistory(newPage);
    }
  };

  // 게임 상태 표시
  const getStatusText = (post: GamePost) => {
    if (post.status === 'CLOSED') return '모집 마감';
    if (post.status === 'CANCELLED') return '취소됨';
    if (post.isFull) return '모집 완료';
    return '모집 중';
  };

  const getStatusColor = (post: GamePost) => {
    if (post.status === 'CLOSED' || post.status === 'CANCELLED') return 'text-red-500';
    if (post.isFull) return 'text-green-500';
    return 'text-blue-500';
  };

  if (profileLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center items-center py-32">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-32">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">오류 발생</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => loadGameMateHistory()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            프로필로 돌아가기
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">게임메이트 내역</h1>
            <p className="text-muted-foreground">참여했던 게임메이트 모임들을 확인하세요</p>
          </div>
        </div>
      </div>

      {/* 게임메이트 내역 목록 */}
      {gamePosts.length === 0 ? (
        <div className="text-center py-32">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground mb-2">참여한 게임메이트가 없습니다</h2>
          <p className="text-muted-foreground mb-6">아직 참여한 게임메이트 모임이 없습니다.</p>
          <Link
            href="/game-mate"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Gamepad2 className="w-4 h-4" />
            게임메이트 찾기
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {gamePosts.map((post) => (
              <div
                key={post.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {post.game?.iconUrl && (
                        <Image
                          src={post.game.iconUrl}
                          alt={post.game.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {post.game?.name || '게임'}
                      </span>
                      <span className={`text-sm font-medium ${getStatusColor(post)}`}>
                        {getStatusText(post)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                  
                  <Link
                    href={`/game-mate/${post.id}`}
                    className="ml-4 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    상세보기
                  </Link>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <DateTimeDisplay date={new Date(post.startTime)} />
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{post._count.participants}/{post.maxParticipants}명</span>
                    </div>
                  </div>
                  
                  <div className="text-xs">
                    작성자: {post.author.name}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 text-sm border rounded transition-colors ${
                    pageNum === pagination.page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}
          
          {/* 총 개수 표시 */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            총 {pagination.total}개의 게임메이트에 참여했습니다
          </div>
        </>
      )}
    </div>
  );
}
