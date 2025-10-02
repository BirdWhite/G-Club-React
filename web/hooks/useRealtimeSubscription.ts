import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/database/supabase';
import type { GamePost } from '@/types/models';

// 게임메이트 목록을 위한 실시간 구독 훅
export function useGamePostListSubscription(
  initialFilters: { status?: string; gameId?: string } = {}
) {
  const [posts, setPosts] = useState<GamePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const supabase = useMemo(() => createClient(), []);
  
  // 참여자 정보 캐시 (DELETE 이벤트 시 postId 찾기용)
  const participantCache = useMemo(() => new Map<string, string>(), []);

  // API를 통해 게시글 목록을 가져오는 함수
  const fetchPosts = useCallback(async (currentFilters: { status?: string; gameId?: string }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (currentFilters.status) query.append('status', currentFilters.status);
      if (currentFilters.gameId) query.append('gameId', currentFilters.gameId);
      
      const response = await fetch(`/api/game-posts?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data);
      
      // 참여자 정보 캐시 업데이트
      data.forEach((post: GamePost) => {
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
    }
  }, [participantCache]);

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
        setPosts(prevPosts => [newPost, ...prevPosts]);
      }
    } catch (error) {
      console.error('Error adding new post:', error);
    }
  }, [filters]);

  // 필터가 변경될 때마다 데이터를 다시 가져옴
  useEffect(() => {
    fetchPosts(filters);
  }, [filters]); // fetchPosts 의존성 제거

  // 실시간 구독 설정 - 부분 업데이트 방식
  useEffect(() => {
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
          // 실시간 연결 실패 시 폴링으로 대체
          const interval = setInterval(() => {
            fetchPosts(filters);
          }, 5000); // 5초마다 폴링
          
          return () => clearInterval(interval);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchSinglePost, addNewPost, filters, debouncedFetchSinglePost]); // fetchPosts 의존성 제거

  return { posts, loading, filters, setFilters };
}

// 게임메이트 상세 페이지를 위한 실시간 구독 훅 (기존 로직 유지)
export function useGamePostDetailSubscription(postId: string, initialPost: GamePost | null = null) {
  const [post, setPost] = useState<GamePost | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const supabase = useMemo(() => createClient(), []);
  
  // 참여자 캐시 추가
  const participantCache = useMemo(() => new Map<string, string>(), []);

  const fetchPost = useCallback(async () => {
    if (!loading) setLoading(true);
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
  }, [postId, loading, participantCache]);

  useEffect(() => {
    if (!initialPost) {
      fetchPost();
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
  }, [fetchPost, initialPost, participantCache, postId]);

  // 실시간 구독 설정 - 개별 필드 업데이트 방식
  useEffect(() => {
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
        (payload: { new?: { userId: string } }) => {
          console.log('GameParticipant INSERT for post:', postId, payload);
          // 캐시에 새 참여자 추가
          if (payload.new && payload.new.userId) {
            participantCache.set(payload.new.userId, postId);
          }
          fetchPost();
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
        (payload: { old?: { userId: string }; new?: { userId: string }; eventType?: string }) => {
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
          // 즉시 새로고침
          console.log('Fetching post after DELETE event...');
          fetchPost();
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
          fetchPost();
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
          fetchPost();
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
          fetchPost();
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
          fetchPost();
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
            
            if (payload.eventType === 'DELETE') {
              // DELETE 이벤트의 경우 전체 새로고침 (안전한 방법)
              console.log('Handling DELETE event, refreshing post data...');
              fetchPost();
            } else {
              // 다른 이벤트의 경우 전체 새로고침
              fetchPost();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, supabase, fetchPost]);

  return { post, loading, refresh: fetchPost };
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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