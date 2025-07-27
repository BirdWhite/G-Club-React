import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// 게임메이트 목록을 위한 실시간 구독 훅
export function useGamePostListSubscription(
  initialFilters: { status?: string; gameId?: string } = {}
) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const supabase = useMemo(() => createClient(), []);

  // API를 통해 게시글 목록을 가져오는 함수
  const fetchPosts = useCallback(async (currentFilters: any) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (currentFilters.status) query.append('status', currentFilters.status);
      if (currentFilters.gameId) query.append('gameId', currentFilters.gameId);
      
      const response = await fetch(`/api/game-posts?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 필터가 변경될 때마다 데이터를 다시 가져옴
  useEffect(() => {
    fetchPosts(filters);
  }, [filters, fetchPosts]);

  // 실시간 구독 설정
  useEffect(() => {
    // 데이터 변경 신호를 받으면 fetchPosts를 다시 호출
    const refetch = () => {
      console.log('Realtime change detected, refetching posts...');
      fetchPosts(filters);
    };

    const channel = supabase.channel(`game_post_list_${Date.now()}`, {
      config: { broadcast: { self: false } },
    }); // 고유한 채널 이름 사용
    
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'GamePost' }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchPosts, filters]); // filters를 의존성에 추가

  return { posts, loading, filters, setFilters };
}

// 게임메이트 상세 페이지를 위한 실시간 구독 훅 (기존 로직 유지)
export function useGamePostDetailSubscription(postId: string, initialPost: any = null) {
  const [post, setPost] = useState<any>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const supabase = useMemo(() => createClient(), []);

  const fetchPost = useCallback(async () => {
    if (!loading) setLoading(true);
    try {
      const response = await fetch(`/api/game-posts/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
      // Optionally set post to null or some error state
    } finally {
      setLoading(false);
    }
  }, [postId, loading]);

  useEffect(() => {
    if (!initialPost) {
      fetchPost();
    }
  }, [fetchPost, initialPost]);

  // 실시간 구독 설정 - 개별 필드 업데이트 방식
  useEffect(() => {
    const channel = supabase
      .channel(`game_post:${postId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'GameParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => {
          // 참여자 변경 시 게시글 정보만 업데이트
          console.log('GameParticipant changed for post:', postId);
          fetchPost();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => {
          // 대기자 변경 시 게시글 정보만 업데이트
          console.log('WaitingParticipant changed for post:', postId);
          fetchPost();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'GamePost',
          filter: `id=eq.${postId}`,
        },
        (payload: any) => {
          // 게시글 정보 변경 시 해당 필드만 업데이트
          console.log('GamePost updated:', payload);
          setPost((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
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
    onInsert?: (payload: any) => void;
    onUpdate?: (payload: any) => void;
    onDelete?: (payload: any) => void;
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
        (payload: any) => {
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
                updateItem(payload.new.id, payload.new as Partial<T>);
              }
              break;
              
            case 'DELETE':
              if (options.onDelete) {
                options.onDelete(payload);
              } else {
                removeItem(payload.old.id);
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