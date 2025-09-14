'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface UserSearchResult {
  userId: string | null;
  name: string;
  email?: string | null;
  image?: string | null;
  isGuest?: boolean;
}

interface UserSearchSelectProps {
  onUserSelect: (user: UserSearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function UserSearchSelect({ 
  onUserSelect, 
  disabled = false,
  placeholder = "사용자 이름을 입력하세요"
}: UserSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 검색 함수
  const searchUsers = async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log('검색 시작:', term);
    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`);
      console.log('검색 응답:', response.status);
      if (response.ok) {
        const users = await response.json();
        console.log('검색 결과:', users);
        setSearchResults(users);
        setShowResults(true);
      } else {
        console.error('검색 실패:', response.status);
        toast.error('사용자 검색 중 오류가 발생했습니다.');
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('사용자 검색 오류:', error);
      toast.error('사용자 검색 중 오류가 발생했습니다.');
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 변경 시 디바운스 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 사용자 선택
  const handleUserSelect = (user: UserSearchResult) => {
    onUserSelect(user);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  // 검색 결과 숨기기
  const handleBlur = () => {
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cyber-gray/40" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pl-10 bg-cyber-black-100 border-cyber-black-300 focus:bg-cyber-black-200"
          disabled={disabled}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyber-blue"></div>
          </div>
        )}
      </div>

      {/* 검색 결과 */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-2">
            {searchResults.map((user) => (
              <button
                key={user.userId}
                className="w-full text-left p-3 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => handleUserSelect(user)}
              >
                <div className="flex items-center space-x-3">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      user.isGuest ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-gray-900">{user.name}</span>
                    {user.isGuest ? (
                      <span className="text-xs text-orange-600">게스트 참여자로 추가</span>
                    ) : user.email ? (
                      <span className="text-xs text-gray-500 truncate max-w-[200px]" title={user.email}>
                        {user.email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {showResults && searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-4 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        </div>
      )}
    </div>
  );
}
