import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/database/supabase';
import toast from 'react-hot-toast';
import type { GamePost, Comment } from '@/types/models';

type SupabaseInstance = ReturnType<typeof createClient>;
type RealtimeChannelType = ReturnType<SupabaseInstance['channel']>;

let reloadToastShown = false;

/**
 * Supabase 실시간 채널 관리 헬퍼 훅
 * - 탭 비활성화/활성화 시 자동 재연결
 * - 네트워크 온라인 복구 시 자동 재연결
 * - CHANNEL_ERROR/TIMED_OUT 시 지수 백오프 재연결 (최대 5회)
 * - 최대 재연결 실패 시 새로고침 안내
 */
function useStableChannel(
  supabase: SupabaseInstance,
  channelBaseName: string | null,
  configureChannel: (channel: RealtimeChannelType) => RealtimeChannelType,
) {
  const configureRef = useRef(configureChannel);
  configureRef.current = configureChannel;

  useEffect(() => {
    if (!channelBaseName) return;

    let channel: RealtimeChannelType | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let isDestroyed = false;
    const MAX_RECONNECT = 5;

    const connect = () => {
      if (isDestroyed) return;
      if (channel) { supabase.removeChannel(channel); channel = null; }
      if (reconnectTimeout) { clearTimeout(reconnectTimeout); reconnectTimeout = null; }

      const newChannel = supabase.channel(`${channelBaseName}_${Date.now()}`, {
        config: { broadcast: { self: false } },
      });
      channel = configureRef.current(newChannel);

      channel.subscribe((status) => {
        if (isDestroyed) return;
        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (reconnectAttempts < MAX_RECONNECT) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
            reconnectTimeout = setTimeout(connect, delay);
          } else if (!reloadToastShown) {
            reloadToastShown = true;
            toast('실시간 연결이 끊어졌습니다.\n페이지를 새로고침해주세요.', {
              icon: '⚠️',
              duration: 10000,
              position: 'bottom-center',
            });
          }
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isDestroyed) {
        reconnectAttempts = 0;
        connect();
      }
    };

    const handleOnline = () => {
      if (!isDestroyed) {
        reconnectAttempts = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    connect();

    return () => {
      isDestroyed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (channel) supabase.removeChannel(channel);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [supabase, channelBaseName]);
}

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
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          // 삭제된(410) 또는 존재하지 않는(404) 게시글 - 목록에서 제거
          setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
          return;
        }
        throw new Error('Failed to fetch post');
      }
      
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
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) return; // 삭제됨/없음 - 무시
        throw new Error('Failed to fetch post');
      }
      
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

  // 실시간 구독 설정 - 부분 업데이트 방식 (자동 재연결 포함)
  useStableChannel(
    supabase,
    'game_post_list',
    (channel) => channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'GamePost' 
      }, (payload) => {
        if (payload.new) {
          addNewPost(payload.new.id);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'GamePost' 
      }, (payload) => {
        if (payload.new) {
          fetchSinglePost(payload.new.id);
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'GamePost' 
      }, (payload) => {
        if (payload.old) {
          setPosts(prevPosts => 
            prevPosts.filter(post => post.id !== payload.old!.id)
          );
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'GameParticipant' 
      }, (payload) => {
        let postId = (payload.new as any)?.gamePostId || (payload.old as any)?.gamePostId;
        
        if (!postId && payload.eventType === 'DELETE' && (payload.old as any)?.userId) {
          postId = participantCache.get((payload.old as any).userId);
          if (postId) {
            participantCache.delete((payload.old as any).userId);
          } else {
            fetchPosts(filters);
            return;
          }
        }
        
        if (payload.eventType === 'INSERT' && (payload.new as any)?.userId && (payload.new as any)?.gamePostId) {
          participantCache.set((payload.new as any).userId, (payload.new as any).gamePostId);
        }
        
        if (postId) {
          debouncedFetchSinglePost(postId);
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
        
        if (!postId && payload.eventType === 'DELETE' && (payload.old as any)?.userId) {
          postId = participantCache.get((payload.old as any).userId);
          if (postId) {
            participantCache.delete((payload.old as any).userId);
          } else {
            fetchPosts(filters);
            return;
          }
        }
        
        if (payload.eventType === 'INSERT' && (payload.new as any)?.userId && (payload.new as any)?.gamePostId) {
          participantCache.set((payload.new as any).userId, (payload.new as any).gamePostId);
        }
        
        if (postId) {
          debouncedFetchSinglePost(postId);
        }
      }),
  );

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
        if (response.status === 404 || response.status === 410) {
          setPost(null); // 삭제됨(410) 또는 없음(404)
          return;
        }
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
        if (response.status === 404 || response.status === 410) {
          // 삭제됨(410) 또는 없음(404)
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
            if (response.status === 404 || response.status === 410) {
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

  // 실시간 구독 설정 - 개별 필드 업데이트 방식 (자동 재연결 포함)
  useStableChannel(
    supabase,
    `game_post_detail_${postId}`,
    (channel) => channel
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'GameParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        async (payload: { new?: { userId: string } }) => {
          if (payload.new && payload.new.userId) {
            participantCache.set(payload.new.userId, postId);
          }
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
        async (payload: { old?: { userId: string } }) => {
          if (payload.old && payload.old.userId) {
            participantCache.delete(payload.old.userId);
          }
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
        () => { debouncedRefresh(); }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => { debouncedRefresh(); }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'WaitingParticipant',
          filter: `gamePostId=eq.${postId}`,
        },
        () => { debouncedRefresh(); }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'GamePost',
          filter: `id=eq.${postId}`,
        },
        () => { debouncedRefresh(); }
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'Comment',
          filter: `gamePostId=eq.${postId}`,
        },
        async () => {
          try {
            const response = await fetch(`/api/game-posts/${postId}`);
            if (response.status === 404 || response.status === 410) {
              setPost(null);
              return;
            }
            if (response.ok) {
              const data = await response.json();
              setPost(data);
            }
          } catch (error) {
            console.error('Error fetching post after Comment change:', error);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'GameParticipant',
        },
        (payload: { new?: { gamePostId: string }; old?: { gamePostId: string }; eventType?: string }) => {
          const isForOurPost =
            (payload.new && payload.new.gamePostId === postId) ||
            (payload.old && payload.old.gamePostId === postId) ||
            payload.eventType === 'DELETE';

          if (isForOurPost) {
            const refreshPost = async () => {
              try {
                const response = await fetch(`/api/game-posts/${postId}`);
                if (response.status === 404 || response.status === 410) {
                  setPost(null);
                  return;
                }
                if (response.ok) {
                  const data = await response.json();
                  setPost(data);
                }
              } catch (error) {
                console.error('Error fetching post after GameParticipant event:', error);
              }
            };
            refreshPost();
          }
        }
      ),
  );

  return { post, loading, refresh: fetchPost };
}

// 댓글 실시간 구독 훅
export function useCommentSubscription(gamePostId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchComments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
    fetchComments(true);
  }, [fetchComments]);

  // 실시간 구독 설정 - 백그라운드 갱신 (자동 재연결 포함)
  useStableChannel(
    supabase,
    `comments_${gamePostId}`,
    (channel) => channel
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'Comment', filter: `gamePostId=eq.${gamePostId}` },
        () => { fetchComments(false); }
      ),
  );

  return { comments, loading, refresh: fetchComments };
}

// 공지사항 댓글 실시간 구독 훅
export function useNoticeCommentSubscription(noticeId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const fetchInProgressRef = useRef(false);

  const fetchComments = useCallback(async (showLoading = true) => {
    if (!noticeId) return;
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`/api/notices/${noticeId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('공지사항 댓글 조회 오류:', error);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [noticeId]);

  useEffect(() => {
    if (noticeId) {
      fetchComments(true);
    } else {
      setComments([]);
      setLoading(false);
    }
  }, [noticeId, fetchComments]);

  // 실시간 구독 설정 (자동 재연결 포함, noticeId가 null이면 비활성)
  useStableChannel(
    supabase,
    noticeId ? `notice_comments_${noticeId}` : null,
    (channel) => channel
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'Comment', filter: `noticeId=eq.${noticeId}` },
        () => { fetchComments(false); }
      ),
  );

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

  useStableChannel(
    supabase,
    `realtime_${table}`,
    (channel) => channel
      .on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: table,
          filter: options.filter,
        },
        (payload: { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
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
      ),
  );

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

  // 실시간 구독 설정 (자동 재연결 포함)
  useStableChannel(
    supabase,
    'notice_list',
    (channel) => channel
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
      }),
  );

  return {
    notices,
    loading,
    refetch: fetchNotices,
  };
}

// 알림 실시간 구독 훅 옵션
export interface UseNotificationSubscriptionOptions {
  /** 새 알림이 추가될 때 호출되는 콜백 (알림 목록 갱신 등) */
  onNewNotification?: () => void;
}

// 알림 실시간 구독 훅
export function useNotificationSubscription(
  userId: string | null,
  options?: UseNotificationSubscriptionOptions
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);
  const onNewNotificationRef = useRef(options?.onNewNotification);
  onNewNotificationRef.current = options?.onNewNotification;

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

  // 실시간 구독 설정 (자동 재연결 포함)
  useStableChannel(
    supabase,
    userId ? `notifications_${userId}` : null,
    (channel) => channel
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'NotificationReceipt',
          filter: `userId=eq.${userId}`,
        },
        () => {
          setUnreadCount(prev => prev + 1);
          onNewNotificationRef.current?.();
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
        (payload: { new?: { isRead?: boolean }; old?: { isRead?: boolean } }) => {
          if (payload.new?.isRead && !payload.old?.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (!payload.new?.isRead && payload.old?.isRead) {
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
        (payload: { old?: { isRead?: boolean } }) => {
          if (!payload.old?.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      ),
  );

  return {
    unreadCount,
    refreshUnreadCount: fetchUnreadCount,
  };
} 