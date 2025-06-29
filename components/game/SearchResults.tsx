'use client';

import { memo } from 'react';
import { UserPlus } from 'lucide-react';
import type { User } from '@/types/game';

interface SearchResultItemProps {
  user: User;
  onAdd: (user: User) => void;
}

const SearchResultItem = memo(({ user, onAdd }: SearchResultItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd(user);
  };

  return (
    <div
      onClick={handleClick}
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
    >
      <UserPlus className="h-4 w-4 text-blue-500" />
      <span>{user.name || '이름 없음'}</span>
      <span className="text-sm text-gray-500">@{user.id}</span>
    </div>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

interface SearchResultsProps {
  users: User[];
  onAdd: (user: User) => void;
  className?: string;
}

const SearchResults = memo(({ users, onAdd, className = '' }: SearchResultsProps) => {
  if (users.length === 0) return null;

  return (
    <div className={`absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto ${className}`}>
      {users.map((user) => (
        <div key={user.id}>
          <SearchResultItem user={user} onAdd={onAdd} />
        </div>
      ))}
    </div>
  );
});

SearchResults.displayName = 'SearchResults';

export default SearchResults;
