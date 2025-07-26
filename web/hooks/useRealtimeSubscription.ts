import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// 게임메이트 특화 훅들
export function useGamePostListSubscription(userId?: string) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/game-posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 실시간 구독 설정 - 개별 아이템 업데이트 방식
  useEffect(() => {
    const channel = supabase
      .channel('game_post_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'GameParticipant' },
        () => {
          // 참여자 변경 시 해당 게시글만 업데이트
          console.log('GameParticipant changed - updating affected posts');
          // TODO: 특정 게시글만 업데이트하는 로직 구현
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'WaitingParticipant' },
        () => {
          // 대기자 변경 시 해당 게시글만 업데이트
          console.log('WaitingParticipant changed - updating affected posts');
          // TODO: 특정 게시글만 업데이트하는 로직 구현
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'GamePost' },
        (payload: any) => {
          // 게시글 상태 변경 시 해당 게시글만 업데이트
          console.log('GamePost updated:', payload);
          setPosts((prev: any[]) => 
            prev.map((post: any) => 
              post.id === payload.new.id 
                ? { ...post, ...payload.new }
                : post
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'GamePost' },
        (payload: any) => {
          // 새 게시글 추가
          console.log('New GamePost inserted:', payload);
          setPosts((prev: any[]) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'GamePost' },
        (payload: any) => {
          // 게시글 삭제
          console.log('GamePost deleted:', payload);
          setPosts((prev: any[]) => prev.filter((post: any) => post.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { posts, loading, refresh: fetchPosts };
}

export function useGamePostDetailSubscription(postId: string) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/game-posts/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }
      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // 실시간 구독 설정 - 개별 필드 업데이트 방식
  useEffect(() => {
    const channel = supabase
      .channel(`game_post:${postId}`)
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