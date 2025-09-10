'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { X, User as UserIcon } from 'lucide-react';
import type { UserProfile, GameParticipant } from '@/types/models';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';

interface ParticipantManagerProps {
  initialParticipants?: GameParticipant[];
  onParticipantsChange?: (participants: GameParticipant[]) => void;
  currentUserId?: string;
}

// 디바운스 유틸리티 함수
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
) {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced as T & { cancel: () => void };
}

export default function ParticipantManager({
  initialParticipants = [],
  onParticipantsChange,
  currentUserId,
}: ParticipantManagerProps) {
  const [participants, setParticipants] = useState<GameParticipant[]>(initialParticipants);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

    // 디바운스된 검색 함수
  const debouncedSearch = useRef(
    debounce(async (query: string, currentParticipants: GameParticipant[]) => {
      if (!query.trim()) {
        setFilteredUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const apiUsers = await res.json();
          // API 응답을 UserProfile 타입으로 변환
          const users: UserProfile[] = apiUsers.map((apiUser: any) => ({
            id: apiUser.userId || `guest-${Date.now()}`,
            userId: apiUser.userId || `guest-${Date.now()}`,
            name: apiUser.name,
            image: apiUser.image,
            birthDate: new Date(), // 게스트의 경우 기본값
            createdAt: new Date(),
            updatedAt: new Date(),
            gameParticipations: [],
            gamePosts: [],
            chatMessages: [],
            chatRooms: [],
            isGuest: apiUser.isGuest
          }));
          // 이미 참가 중인 사용자 필터링
          const available = users.filter(
            (user: UserProfile) => {
              if (user.isGuest) {
                return !currentParticipants.some((p) => p.guestName === user.name);
              } else {
                return !currentParticipants.some((p) => p.userId === user.userId);
              }
            }
          );
          setFilteredUsers(available);
        } else {
          console.error('검색 오류:', await res.text());
          toast.error('사용자 검색 중 오류가 발생했습니다.');
        }
      } catch (err) {
        console.error('검색 요청 실패:', err);
        toast.error('검색 요청을 처리할 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    }, 300)
  ).current;

  // 검색어 변경 시 검색 실행
  useEffect(() => {
    debouncedSearch(searchQuery, participants);
    return () => {
      debouncedSearch.cancel?.();
    };
  }, [searchQuery, debouncedSearch, participants]);

  // 외부로부터의 participants 변경 감지 (초기 마운트 시에만 실행)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      setParticipants(initialParticipants);
      isInitialMount.current = false;
    }
  }, [initialParticipants]);

  // 참여자 변경 시 부모 컴포넌트에 알림
  useEffect(() => {
    onParticipantsChange?.(participants);
  }, [participants, onParticipantsChange]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 참여자 추가
  const addParticipant = useCallback((user: UserProfile) => {
    setParticipants(prev => {
      // 중복 체크 (게스트는 이름으로, 일반 사용자는 userId로)
      if (user.isGuest) {
        if (prev.some((p) => p.guestName === user.name)) {
          toast.error('이미 추가된 게스트 참여자입니다.');
          return prev;
        }
      } else {
        if (prev.some((p) => p.userId === user.userId)) {
          toast.error('이미 추가된 사용자입니다.');
          return prev;
        }
      }

      const newParticipant: GameParticipant = {
        id: `temp-${Date.now()}`,
        gamePostId: '', // 임시값, 실제 저장 시 설정
        participantType: user.isGuest ? 'GUEST' : 'MEMBER',
        userId: user.isGuest ? undefined : user.userId,
        guestName: user.isGuest ? user.name : undefined,
        joinedAt: new Date().toISOString(),
        user: user.isGuest ? undefined : {
          id: user.id,
          name: user.name,
          image: user.image
        }
      };

      setSearchQuery('');
      setFilteredUsers([]);
      
      // 검색 필드에 포커스 유지
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);

      return [...prev, newParticipant];
    });
  }, []);

  // 참여자 제거
  const removeParticipant = useCallback((participantId: string) => {
    setParticipants(prev => prev.filter((p) => p.id !== participantId));
  }, []);

  // 검색 입력 핸들러
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setIsSearchFocused(true);
    } else {
      setFilteredUsers([]);
      setIsSearchFocused(false);
    }
  }, []);

  // 검색 포커스 핸들러
  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery, participants);
    }
  }, [searchQuery, debouncedSearch, participants]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">참여자 관리</h3>
      
      {/* 참여자 검색 및 추가 */}
      <div className="relative" ref={searchContainerRef}>
        <SearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          placeholder="참여자 이름으로 검색하세요"
          isLoading={isLoading}
        />
        
        {/* 검색 결과 드롭다운 */}
        {isSearchFocused && searchQuery && filteredUsers.length > 0 && (
          <SearchResults 
            users={filteredUsers} 
            onAdd={addParticipant} 
            className="mt-1"
          />
        )}
      </div>
      
      {/* 참여자 목록 */}
      <div className="space-y-2">
        {participants.length > 0 ? (
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {participant.user?.name || participant.guestName || '이름 없음'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {participant.user ? `@${participant.user.id}` : '게스트 참여자'}
                    </span>
                  </div>
                  {participant.participantType === 'MEMBER' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      멤버
                    </span>
                  )}
                  {participant.participantType === 'GUEST' && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      게스트
                    </span>
                  )}
                </div>
                {participant.participantType !== 'MEMBER' && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="참여자 제거"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>아직 참여자가 없습니다. 위에서 검색하여 추가해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
