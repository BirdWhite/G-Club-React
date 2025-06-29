'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { X, User as UserIcon } from 'lucide-react';
import type { User, Participant } from '@/types/game';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';

interface ParticipantManagerProps {
  initialParticipants?: Participant[];
  onParticipantsChange?: (participants: Participant[]) => void;
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
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

    // 디바운스된 검색 함수
  const debouncedSearch = useRef(
    debounce(async (query: string, currentParticipants: Participant[]) => {
      if (!query.trim()) {
        setFilteredUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const users = await res.json();
          // 이미 참가 중인 사용자 필터링
          const available = users.filter(
            (user: User) => !currentParticipants.some((p) => p.user.id === user.id)
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
  const addParticipant = useCallback((user: User) => {
    setParticipants(prev => {
      if (prev.some((p) => p.user.id === user.id)) {
        toast.error('이미 추가된 참여자입니다.');
        return prev;
      }

      const newParticipant: Participant = {
        id: `temp-${Date.now()}`,
        user,
        isLeader: false,
        isReserve: false,
        createdAt: new Date().toISOString(),
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
                      {participant.user.name || '이름 없음'}
                    </span>
                    <span className="text-xs text-gray-500">@{participant.user.id}</span>
                  </div>
                  {participant.isLeader && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                      방장
                    </span>
                  )}
                </div>
                {!participant.isLeader && (
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
