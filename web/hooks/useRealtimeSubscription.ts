import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/database/supabase';
import type { GamePost, Comment } from '@/types/models';

// 게임메이트 목록을 위한 실시간 구독 훅 (무한 스크롤 지원)
export function useGamePostListSubscription(
  initialFilters: { status?: string; gameId?: string; limit?: number } = {}
) {
  const [posts, setPosts] = useState<GamePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);
  const supabase = useMemo(() => createClient(), []);
  
  // 참여자 정보 캐시 (DELETE 이벤트 시 postId 찾기용)
  const participantCache = useMemo(() => new Map<string, string>(), []);

  // API를 통해 게시글 목록을 가져오는 함수 (초기 로드)
  const fetchPosts = useCallback(async (currentFilters: { status?: string; gameId?: string; limit?: number }, page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const query = new URLSearchParams();
      if (currentFilters.status) query.append('status', currentFilters.status);
      if (currentFilters.gameId) query.append('gameId', currentFilters.gameId);
      query.append('page', page.toString());
      query.append('limit', (currentFilters.limit || 20).toString()); // 기본 20개, 커스텀 가능
      
      const response = await fetch(`/api/game-posts?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      
      if (append) {
        // 무한 스크롤: 기존 데이터에 추가 (중복 방지)
        setPosts(prev => {
          const existingIds = new Set(prev.map(post => post.id));
          const newPosts = (data.posts || []).filter((post: GamePost) => !existingIds.has(post.id));
          return [...prev, ...newPosts];
        });
      } else {
        // 초기 로드: 데이터 교체
        setPosts(data.posts || []);
      }
      
      // hasMore 상태 업데이트
      setHasMore(data.pagination.page < data.pagination.totalPages);
      setCurrentPage(page);
      
      // 참여자 정보 캐시 업데이트
      (data.posts || []).forEach((post: GamePost) => {
        post.participants?.forEach((participant) => {
          if (participant.userId) {
            participantCache.set(participant.userId, post.id);
          }
        });
        post.waitingList?.forEach((waiting) => {
          if (waiting.userId) {
            participantCache.set(waiting.userId, post.id);
          }
        });
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [participantCache]);

  // 더 많은 게시글을 로드하는 함수 (무한 스크롤)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(filters, currentPage + 1, true);
    }
  }, [fetchPosts, filters, currentPage, loadingMore, hasMore]);

  // 개별 게시글을 가져오는 함수 (부분 업데이트용)
  const fetchSinglePost = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/game-posts/${postId}?list=true`);
      if (!response.ok) throw new Error('Failed to fetch post');
      
      const updatedPost = await response.json();
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? updatedPost : post
        )
      );
    } catch (error) {
      console.error('Error fetching single post:', error);
    }
  }, []);

  // 디바운스된 게시글 업데이트 함수
  const debouncedFetchSinglePost = useCallback((() => {
    let timeoutId: NodeJS.Timeout;
    const pendingUpdates = new Set<string>();
    
    return (postId: string) => {
      pendingUpdates.add(postId);
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // 모든 대기 중인 업데이트를 한 번에 처리
        pendingUpdates.forEach(id => {
          fetchSinglePost(id);
        });
        pendingUpdates.clear();
      }, 300); // 300ms 디바운스
    };
  })(), [fetchSinglePost]);

  // 새 게시글을 목록에 추가하는 함수
  const addNewPost = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/game-posts/${postId}?list=true`);
      if (!response.ok) throw new Error('Failed to fetch post');
      
      const newPost = await response.json();
      
      // 필터 조건 확인
      let shouldAdd = true;
      
      if (filters.status) {
        if (filters.status === 'recruiting') {
          shouldAdd = newPost.status === 'OPEN' || newPost.isFull || newPost.status === 'IN_PROGRESS';
        } else if (filters.status === 'completed_expired') {
          shouldAdd = newPost.status === 'COMPLETED' || newPost.status === 'EXPIRED';
        } else {
          shouldAdd = newPost.status === filters.status;
        }
      }
      
      if (filters.gameId && filters.gameId !== 'all') {
        shouldAdd = shouldAdd && newPost.gameId === filters.gameId;
      }
      
      if (shouldAdd) {
        setPosts(prevPosts => {
          // 중복 방지: 이미 존재하는 게시글인지 확인
          const exists = prevPosts.some(post => post.id === newPost.id);
          if (exists) {
            return prevPosts;
          }
          return [newPost, ...prevPosts];
        });
      }
    } catch (error) {
      console.error('Error adding new post:', error);
    }
  }, [filters]);

  // 필터가 변경될 때마다 데이터를 다시 가져옴 (상태 리셋)
  useEffect(() => {
    setPosts([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchPosts(filters, 1, false);
  }, [filters]); // fetchPosts 의존성 제거

  // 실시간 구독 설정 - 부분 업데이트 방식
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const channel = supabase.channel(`game_post_list_${Date.now()}`, {
      config: { broadcast: { self: false } },
    });
    
    // GamePost 테이블 변경사항 처리
    channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'GamePost' 
      }, (payload) => {
        // 새 게시글 추가 - 목록 맨 앞에 추가
        if (payload.new) {
          addNewPost(payload.new.id);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'GamePost' 
      }, (payload) => {
        // 게시글 업데이트 (참여자 수 변경 포함)
        if (payload.new) {
          fetchSinglePost(payload.new.id);
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'GamePost' 
      }, (payload) => {
        // 게시글 삭제
        if (payload.old) {
          setPosts(prevPosts => 
            prevPosts.filter(post => post.id !== payload.old!.id)
          );
        }
      })
      // 참여자 수 변경을 위해 다시 추가
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'GameParticipant' 
      }, (payload) => {
        let postId = (payload.new as any)?.gamePostId || (payload.old as any)?.gamePostId;
        
        // DELETE 이벤트 시 캐시에서 postId 찾기
        if (!postId && payload.eventType === 'DELETE' && (payload.old as any)?.userId) {
          postId = participantCache.get((payload.old as any).userId);
          if (postId) {
            // 캐시에서 제거
            participantCache.delete((payload.old as any).userId);
          } else {
            // 캐시에 없으면 전체 목록 새로고침
            fetchPosts(filters);
            return;
          }
        }
        
        // INSERT 이벤트 시 캐시에 추가
        if (payload.eventType === 'INSERT' && (payload.new as any)?.userId && (payload.new as any)?.gamePostId) {
          participantCache.set((payload.new as any).userId, (payload.new as any).gamePostId);
        }
        
        if (postId) {
          debouncedFetchSinglePost(postId);
          
          // 참여자 제거 시 즉시 업데이트 (더 안정적)
          if (payload.eventType === 'DELETE') {
            setTimeout(() => {
              fetchSinglePost(postId);
            }, 100);
          }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'WaitingParticipant' 
      }, (payload) => {
        let postId = (payload.new as any)?.gamePostId || (payload.old as any)?.gamePostId;
        
        // DELETE 이벤트 시 캐시에서 postId 찾기
        if (!postId && payload.eventType === 'DELETE' && (payload.old as any)?.userId) {
          postId = participantCache.get((payload.old as any).userId);
          if (postId) {
            // 캐시에서 제거
            participantCache.delete((payload.old as any).userId);
          } else {
            // 캐시에 없으면 전체 목록 새로고침
            fetchPosts(filters);
            return;
          }
        }
        
        // INSERT 이벤트 시 캐시에 추가
        if (payload.eventType === 'INSERT' && (payload.new as any)?.userId && (payload.new as any)?.gamePostId) {
          participantCache.set((payload.new as any).userId, (payload.new as any).gamePostId);
        }
        
        if (postId) {
          debouncedFetchSinglePost(postId);
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log('게임 포스트 실시간 구독 실패, 폴링으로 대체');
          // 실시간 연결 실패 시 폴링으로 대체
          pollingInterval = setInterval(() => {
            fetchPosts(filters);
          }, 5000); // 5초마다 폴링
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [supabase, filters, fetchPosts]); // 필요한 의존성만 유지

  return { 
    posts, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore, 
    filters, 
    setFilters 
  };
}

// 게임메이트 상세 페이지를 위한 실시간 구독 훅 (기존 로직 유지)
export function useGamePostDetailSubscription(postId: string, initialPost: GamePost | null = null) {
  const [post, setPost] = useState<GamePost | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const supabase = useMemo(() => createClient(), []);
  
  // 참여자 캐시 추가
  const participantCache = useMemo(() => new Map<string, string>(), []);
  
  // 디바운싱을 위한 ref
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 디바운싱된 새로고침 함수
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/game-posts/${postId}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
        }
      } catch (error) {
        console.error('Error fetching post after debounced refresh:', error);
      }
    }, 500); // 500ms 디바운싱
  }, [postId]);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/game-posts/${postId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // 게시글이 삭제된 경우
          setPost(null);
          return;
        }
        throw new Error('Failed to fetch post');
      }
      const data = await response.json();
      
      // 참여자 캐시 업데이트
      if (data.participants) {
        data.participants.forEach((participant: { userId?: string }) => {
          if (participant.userId) {
            participantCache.set(participant.userId, postId);
          }
        });
      }
      
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
      // Optionally set post to null or some error state
    } finally {
      setLoading(false);
    }
  }, [postId, participantCache]);

  useEffect(() => {
    if (!initialPost) {
      const loadPost = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/game-posts/${postId}`);
          if (!response.ok) {
            if (response.status === 404) {
              setPost(null);
              return;
            }
            throw new Error('Failed to fetch post');
          }
          const data = await response.json();
          
          // 참여자 캐시 업데이트
          if (data.participants) {
            data.participants.forEach((participant: { userId?: string }) => {
              if (participant.userId) {
                participantCache.set(participant.userId, postId);
              }
            });
          }
          
          setPost(data);
        } catch (error) {
          console.error('Error fetching post:', error);
        } finally {
          setLoading(false);
        }
      };
      loadPost();
    } else {
      // initialPost가 있을 때도 캐시 초기화
      if (initialPost.participants) {
        initialPost.participants.forEach((participant) => {
          if (participant.userId) {
            participantCache.set(participant.userId, postId);
          }
        });
      }
    }
  }, [initialPost, participantCache, postId]);

  // 실시간 구독 설정 - 개별 필드 업데이트 방식
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`game_post:${postId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'GameParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        async (payload: { new?: { userId: string } }) => {
          console.log('GameParticipant INSERT for post:', postId, payload);
          // 캐시에 새 참여자 추가
          if (payload.new && payload.new.userId) {
            participantCache.set(payload.new.userId, postId);
          }
          // 디바운싱된 새로고침
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'GameParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        async (payload: { old?: { userId: string }; new?: { userId: string }; eventType?: string }) => {
          console.log('GameParticipant DELETE for post:', postId, payload);
          console.log('DELETE payload details:', {
            old: payload.old,
            new: payload.new,
            eventType: payload.eventType
          });
          // 캐시에서 해당 참여자 제거
          if (payload.old && payload.old.userId) {
            participantCache.delete(payload.old.userId);
          }
          // 디바운싱된 새로고침
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => {
          console.log('WaitingParticipant INSERT for post:', postId);
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => {
          console.log('WaitingParticipant UPDATE for post:', postId);
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => {
          console.log('WaitingParticipant DELETE for post:', postId);
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'GamePost',
          filter: `id=eq.${postId}`,
        },
        (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          // 게시글 정보 변경 시 전체 데이터 새로고침 (참여자 정보 포함)
          console.log('GamePost updated:', payload);
          debouncedRefresh();
        }
      )
      // 댓글 실시간 구독 추가
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${postId}`,
        },
        async () => {
          try {
            const response = await fetch(`/api/game-posts/${postId}`);
            if (response.ok) {
              const data = await response.json();
              setPost(data);
            }
          } catch (error) {
            console.error('Error fetching post after Comment INSERT:', error);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${postId}`,
        },
        async () => {
          try {
            const response = await fetch(`/api/game-posts/${postId}`);
            if (response.ok) {
              const data = await response.json();
              setPost(data);
            }
          } catch (error) {
            console.error('Error fetching post after Comment UPDATE:', error);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${postId}`,
        },
        async () => {
          try {
            const response = await fetch(`/api/game-posts/${postId}`);
            if (response.ok) {
              const data = await response.json();
              setPost(data);
            }
          } catch (error) {
            console.error('Error fetching post after Comment DELETE:', error);
          }
        }
      )
      // 백업: 모든 GameParticipant 이벤트 감지 (필터 없이)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'GameParticipant',
        },
        (payload: { new?: { gamePostId: string }; old?: { gamePostId: string }; eventType?: string }) => {
          console.log('GameParticipant ANY event:', payload);
          
          // 해당 게시글의 이벤트인지 확인
          let isForOurPost = false;
          
          if (payload.new && payload.new.gamePostId === postId) {
            isForOurPost = true;
          } else if (payload.old && payload.old.gamePostId === postId) {
            isForOurPost = true;
          } else if (payload.eventType === 'DELETE') {
            // DELETE 이벤트의 경우 항상 해당 게시글의 이벤트로 간주
            isForOurPost = true;
          }
          
          if (isForOurPost) {
            console.log('This event is for our post, updating...');
            
            // 모든 이벤트에 대해 직접 API 호출
            const refreshPost = async () => {
              try {
                const response = await fetch(`/api/game-posts/${postId}`);
                if (response.ok) {
                  const data = await response.json();
                  setPost(data);
                }
              } catch (error) {
                console.error('Error fetching post after GameParticipant ANY event:', error);
              }
            };
            
            if (payload.eventType === 'DELETE') {
              // DELETE 이벤트의 경우 전체 새로고침 (안전한 방법)
              console.log('Handling DELETE event, refreshing post data...');
              refreshPost();
            } else {
              // 다른 이벤트의 경우 전체 새로고침
              refreshPost();
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log('게임 포스트 상세 실시간 구독 실패, 폴링으로 대체');
          // 실시간 연결 실패 시 폴링으로 대체
          pollingInterval = setInterval(() => {
            fetchPost();
          }, 15000); // 15초마다 폴링
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [postId, supabase, fetchPost]);

  return { post, loading, refresh: fetchPost };
}

// 댓글 실시간 구독 훅
export function useCommentSubscription(gamePostId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/game-posts/${gamePostId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [gamePostId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 실시간 구독 설정
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`comments_${gamePostId}_${Date.now()}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${gamePostId}`,
        },
        () => {
          fetchComments();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${gamePostId}`,
        },
        () => {
          fetchComments();
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${gamePostId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log('댓글 실시간 구독 실패, 폴링으로 대체');
          // 실시간 연결 실패 시 폴링으로 대체
          pollingInterval = setInterval(() => {
            fetchComments();
          }, 10000); // 10초마다 폴링
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [gamePostId, supabase, fetchComments]);

  return { comments, loading, refresh: fetchComments };
}

// 범용 실시간 구독 훅 (향후 확장용)
export function useRealtimeSubscription<T extends { id: string }>(
  table: string,
  options: {
    schema?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onInsert?: (payload: { new?: Record<string, unknown> }) => void;
    onUpdate?: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void;
    onDelete?: (payload: { old?: Record<string, unknown> }) => void;
  } = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const addItem = useCallback((item: T) => {
    setData((prev: T[]) => {
      if (prev.some((existing: T) => existing.id === item.id)) {
        return prev;
      }
      return [item, ...prev];
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setData((prev: T[]) => 
      prev.map((item: T) => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setData((prev: T[]) => prev.filter((item: T) => item.id !== id));
  }, []);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`realtime_${table}_${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: table,
          filter: options.filter,
        },
        (payload: { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          console.log('Realtime update received:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              if (options.onInsert) {
                options.onInsert(payload);
              } else {
                addItem(payload.new as T);
              }
              break;
              
            case 'UPDATE':
              if (options.onUpdate) {
                options.onUpdate(payload);
              } else {
                if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
                  updateItem(payload.new.id as string, payload.new as Partial<T>);
                }
              }
              break;
              
            case 'DELETE':
              if (options.onDelete) {
                options.onDelete(payload);
              } else {
                if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                  removeItem(payload.old.id as string);
                }
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log(`${table} 실시간 구독 실패, 폴링으로 대체`);
          // 실시간 연결 실패 시 폴링으로 대체 (기본 30초)
          pollingInterval = setInterval(() => {
            // 폴링 로직은 각 훅에서 개별적으로 구현
            console.log(`${table} 폴링 실행`);
          }, 30000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [supabase, table, options.event, options.schema, options.filter, options.onInsert, options.onUpdate, options.onDelete, addItem, updateItem, removeItem]);

  return {
    data,
    loading,
    addItem,
    updateItem,
    removeItem,
  };
}

// 공지사항 실시간 구독 훅
export function useNoticeListSubscription() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // 공지사항 목록 가져오기
  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notices?page=1&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setNotices(data.notices || []);
      }
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 새 공지사항 추가
  const addNewNotice = useCallback(async (noticeId: string) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}`);
      
      // 404 에러: 이미 삭제된 공지사항 (조용히 무시)
      if (response.status === 404) {
        return;
      }
      
      const data = await response.json();
      
      // API는 notice 객체를 직접 반환함
      if (data && data.id) {
        setNotices(prevNotices => [data, ...prevNotices]);
      }
    } catch (error) {
      console.error('새 공지사항 조회 실패:', error);
    }
  }, []);

  // 공지사항 업데이트
  const updateNotice = useCallback(async (noticeId: string) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}`);
      
      // 404 에러: 공지사항이 삭제됨 → 목록에서 제거
      if (response.status === 404) {
        setNotices(prevNotices => 
          prevNotices.filter(notice => notice.id !== noticeId)
        );
        return;
      }
      
      const data = await response.json();
      
      // API는 notice 객체를 직접 반환함
      if (data && data.id) {
        setNotices(prevNotices => 
          prevNotices.map(notice => 
            notice.id === noticeId ? data : notice
          )
        );
      }
    } catch (error) {
      console.error('공지사항 업데이트 실패:', error);
    }
  }, []);

  // 초기 데이터 로드 (한 번만 실행)
  useEffect(() => {
    fetchNotices();
  }, []); // fetchNotices 의존성 제거

  // 실시간 구독 설정 (한 번만 실행)
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`notice_list_${Date.now()}`, {
        config: { broadcast: { self: false } },
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'Notice' 
      }, (payload) => {
        if (payload.new) {
          addNewNotice(payload.new.id);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'Notice' 
      }, (payload) => {
        if (payload.new) {
          updateNotice(payload.new.id);
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'Notice' 
      }, (payload) => {
        if (payload.old) {
          setNotices(prevNotices => 
            prevNotices.filter(notice => notice.id !== payload.old!.id)
          );
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log('공지사항 실시간 구독 실패, 폴링으로 대체');
          // 실시간 연결 실패 시 폴링으로 대체
          pollingInterval = setInterval(() => {
            fetchNotices();
          }, 30000); // 30초마다 폴링
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [supabase, addNewNotice, updateNotice, fetchNotices]); // 의존성 추가

  return {
    notices,
    loading,
    refetch: fetchNotices,
  };
}

// 알림 실시간 구독 훅
export function useNotificationSubscription(userId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  // 읽지 않은 알림 수 가져오기
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/notifications?unreadOnly=true&limit=1');
      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('읽지 않은 알림 수 조회 실패:', error);
    }
  }, [userId]);

  // 초기 알림 수 로드
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // 실시간 구독 설정
  useEffect(() => {
    if (!userId) return;

    let pollingInterval: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`notifications_${userId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'NotificationReceipt',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('새 알림 수신:', payload);
          // 새 알림이 추가되면 읽지 않은 수 증가
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'NotificationReceipt',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('알림 상태 변경:', payload);
          // 알림이 읽음 처리되면 읽지 않은 수 감소
          if (payload.new?.isRead && !payload.old?.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          // 알림이 읽지 않음으로 변경되면 읽지 않은 수 증가
          else if (!payload.new?.isRead && payload.old?.isRead) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'NotificationReceipt',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('알림 삭제:', payload);
          // 알림이 삭제되면 읽지 않은 수 감소 (삭제된 알림이 읽지 않았던 경우)
          if (!payload.old?.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.log('알림 실시간 구독 실패, 폴링으로 대체');
          // 실시간 연결 실패 시 폴링으로 대체
          pollingInterval = setInterval(() => {
            fetchUnreadCount();
          }, 10000); // 10초마다 폴링
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [userId, supabase, fetchUnreadCount]); // fetchUnreadCount 의존성 추가

  return {
    unreadCount,
    refreshUnreadCount: fetchUnreadCount,
  };
} 